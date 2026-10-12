import type { Box, Decoration } from "../style/types";
import { stableKey } from "../utils/stableKey";

/** One decoration along a stretch of one line. */
export interface LayoutDecoration {
  /** The decoration, from the style of the runs it spans. */
  decoration: Decoration;
  lineIndex: number;
  /** Glyph index range `[start, end)`. */
  start: number;
  end: number;
  /** What the decoration covers, in layout coordinates: the box of a box decoration, padding included. */
  box: Box;
  /** Largest font size of its glyphs, after `shrink`. */
  fontSize: number;
}

/** What decoration layout needs to know about a glyph. */
export interface DecorationGlyph {
  lineIndex: number;
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
 * Decorations of laid-out glyphs: one entry per decoration and per stretch of a line whose glyphs all carry it, in the
 * order decorations first appear. Whitespace at the edges of a line is left out; whitespace inside a stretch isn't.
 */
export function layoutDecorations(
  glyphs: readonly DecorationGlyph[],
  lineCount: number,
  vertical: boolean,
): LayoutDecoration[] {
  const order = new Map<string, number>();
  const stretches: { key: string; decoration: Decoration; lineIndex: number; start: number; end: number }[] = [];
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
        keys.add(key);
        if (!order.has(key)) order.set(key, order.size);
        const stretch = open.get(key);
        if (stretch && stretch.lineIndex === glyph.lineIndex && stretch.end === index) {
          stretch.end = index + 1;
        } else {
          const started = { key, decoration, lineIndex: glyph.lineIndex, start: index, end: index + 1 };
          stretches.push(started);
          open.set(key, started);
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

function place(
  stretch: { decoration: Decoration; lineIndex: number; start: number; end: number },
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
  const [from, to] = decoration.inset ?? [0, 1];
  const size = under - over;
  [over, under] = [over + from * size, over + to * size];
  const { padding = 0 } = decoration;
  const [along, across] = typeof padding === "number" ? [padding, padding] : padding;
  inlineStart -= along;
  inlineEnd += along;
  over -= across;
  under += across;

  const box = vertical
    ? { x: -under, y: inlineStart, width: under - over, height: inlineEnd - inlineStart }
    : { x: inlineStart, y: over, width: inlineEnd - inlineStart, height: under - over };
  return { decoration, lineIndex: stretch.lineIndex, start: stretch.start, end: stretch.end, box, fontSize };
}
