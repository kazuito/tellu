import { resolveLength } from "../style/defaults";
import { boxDecorationPadding } from "../style/resolve";
import type { Box, Decoration, LineDecoration } from "../style/types";
import { stableKey } from "../utils/stableKey";

/** One decoration along a stretch of one line. */
export interface LayoutDecoration {
  /** The decoration, from the style of the runs it spans. */
  decoration: Decoration;
  lineIndex: number;
  /** Glyph index range `[start, end)`. */
  start: number;
  end: number;
  /** The run of its first glyph. A line decoration is painted with this run's layers. */
  runIndex: number;
  /**
   * What the decoration covers, in layout coordinates: the box of a box decoration, padding included, or the band a
   * line decoration is drawn in.
   */
  box: Box;
  /** Largest font size of its glyphs, after `shrink`. */
  fontSize: number;
}

/** What decoration layout needs to know about a glyph. */
export interface DecorationGlyph {
  lineIndex: number;
  runIndex: number;
  /** Equal for runs with equal layers. Line decorations restart where it changes, so each part takes its run's look. */
  layersKey: string;
  isWhitespace: boolean;
  decorations: readonly Decoration[];
  /** The glyph's cell. */
  box: Box;
  fontSize: number;
  /**
   * The em box across the line, as a coordinate that grows from the over side to the under side: `y` in horizontal
   * text, `-x` in vertical text.
   */
  over: number;
  under: number;
}

const keys = new WeakMap<Decoration, string>();

/** Equal decorations get equal keys; runs share decoration objects, so each is serialized once. */
export function decorationKey(decoration: Decoration): string {
  let key = keys.get(decoration);
  if (key === undefined) {
    key = stableKey(decoration);
    keys.set(decoration, key);
  }
  return key;
}

/**
 * Decorations of laid-out glyphs: one entry per decoration and per stretch of a line whose glyphs all carry it (and,
 * for lines, have equal layers), in the order decorations first appear. Whitespace at the edges of a line is left out;
 * whitespace inside a stretch isn't.
 */
export function layoutDecorations(
  glyphs: readonly DecorationGlyph[],
  lineCount: number,
  vertical: boolean,
): LayoutDecoration[] {
  const order = new Map<string, number>();
  const stretches: {
    key: string;
    decoration: Decoration;
    lineIndex: number;
    runIndex: number;
    start: number;
    end: number;
  }[] = [];
  const open = new Map<string, (typeof stretches)[number]>();

  // The glyphs of a line, minus the whitespace at its edges.
  const content = Array.from({ length: lineCount }, () => [Infinity, -Infinity]);
  glyphs.forEach((glyph, index) => {
    if (glyph.isWhitespace) return;
    const range = content[glyph.lineIndex]!;
    range[0] = Math.min(range[0]!, index);
    range[1] = Math.max(range[1]!, index + 1);
  });

  glyphs.forEach((glyph, index) => {
    const [first, last] = content[glyph.lineIndex]!;
    const inside = index >= first! && index < last!;
    const keys = new Set<string>();
    if (inside) {
      for (const decoration of glyph.decorations) {
        const key = decorationKey(decoration);
        if (!order.has(key)) order.set(key, order.size);
        const openKey = decoration.type === "line" ? `${key}\u0000${glyph.layersKey}` : key;
        keys.add(openKey);
        const stretch = open.get(openKey);
        if (stretch && stretch.lineIndex === glyph.lineIndex && stretch.end === index) {
          stretch.end = index + 1;
        } else {
          const { lineIndex, runIndex } = glyph;
          const started = { key, decoration, lineIndex, runIndex, start: index, end: index + 1 };
          stretches.push(started);
          open.set(openKey, started);
        }
      }
    }
    for (const key of open.keys()) if (!keys.has(key)) open.delete(key);
  });

  return stretches
    .map((stretch, position) => ({ stretch, position }))
    .sort((a, b) => order.get(a.stretch.key)! - order.get(b.stretch.key)! || a.position - b.position)
    .map(({ stretch }) => place(stretch, glyphs.slice(stretch.start, stretch.end), vertical));
}

/** Thickness of a line decoration's stroke, at a font size. */
export function lineThickness(decoration: LineDecoration, fontSize: number): number {
  return Math.max(0, resolveLength(decoration.thickness ?? { em: 0.06 }, fontSize));
}

/** Size of the band a line decoration is drawn in, across the line, in strokes of its thickness. */
export function lineBandStrokes(decoration: LineDecoration): number {
  const { style = "solid" } = decoration;
  return style === "double" || style === "wavy" ? 3 : 1;
}

/** Where a line decoration's band goes across the line, `[over, under]`, given the em box `[over, under]`. */
function lineBand(decoration: LineDecoration, over: number, under: number, fontSize: number, vertical: boolean) {
  const position =
    decoration.position === undefined || decoration.position === "auto"
      ? vertical
        ? "over"
        : "under"
      : decoration.position;
  const size = lineThickness(decoration, fontSize) * lineBandStrokes(decoration);
  const offset = resolveLength(decoration.offset ?? (position === "through" ? 0 : { em: 0.05 }), fontSize);
  if (position === "under") return [under + offset, under + offset + size] as const;
  if (position === "over") return [over - offset - size, over - offset] as const;
  const middle = (over + under) / 2 + offset;
  return [middle - size / 2, middle + size / 2] as const;
}

function place(
  stretch: { decoration: Decoration; lineIndex: number; runIndex: number; start: number; end: number },
  glyphs: readonly DecorationGlyph[],
  vertical: boolean,
): LayoutDecoration {
  const first = glyphs[0]!.box;
  const last = glyphs.at(-1)!.box;
  let inlineStart = vertical ? first.y : first.x;
  let inlineEnd = vertical ? last.y + last.height : last.x + last.width;
  let over = Math.min(...glyphs.map((glyph) => glyph.over));
  let under = Math.max(...glyphs.map((glyph) => glyph.under));
  const fontSize = Math.max(...glyphs.map((glyph) => glyph.fontSize));

  const { decoration } = stretch;
  if (decoration.type === "line") {
    [over, under] = lineBand(decoration, over, under, fontSize, vertical);
  } else {
    const [from, to] = decoration.inset ?? [0, 1];
    const size = under - over;
    [over, under] = [over + from * size, over + to * size];
    const [along, across] = boxDecorationPadding(decoration, fontSize);
    inlineStart -= along;
    inlineEnd += along;
    over -= across;
    under += across;
  }

  const box = vertical
    ? { x: -under, y: inlineStart, width: under - over, height: inlineEnd - inlineStart }
    : { x: inlineStart, y: over, width: inlineEnd - inlineStart, height: under - over };
  const { lineIndex, runIndex, start, end } = stretch;
  return { decoration, lineIndex, start, end, runIndex, box, fontSize };
}
