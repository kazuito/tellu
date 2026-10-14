import type { Box } from "../style/types";
import type { Layout, LayoutLine } from "./layout";
import { isVertical } from "./vertical";

/** Options of `wipeClip()`. */
export interface WipeClipOptions {
  /**
   * What `progress` runs over: `"length"` wipes at an even speed along the lines, `"glyph"` gives every visible glyph
   * the same share of the time, so a line of small glyphs wipes as fast as a line of large ones. Default: `"length"`.
   */
  by?: "length" | "glyph";
  /**
   * How far past the text the boxes reach at the start and end of each line and above and below the first and last
   * line, as a factor of the line's font size, so outlines, shadows and glows are wiped with their glyphs. Between
   * lines, the boxes meet halfway. Default: `2`.
   */
  margin?: number;
}

/** A line's extent across the lines, `[from, to]`: y in horizontal text, x in vertical text. */
function across(line: LayoutLine, vertical: boolean): [number, number] {
  const box = line.contentBox;
  return vertical ? [box.x, box.x + box.width] : [box.y, box.y + box.height];
}

/**
 * Boxes for `clip` that reveal a caption along its lines, in reading order, like a karaoke wipe: lines before the
 * point `progress` (`0`–`1`) has reached show in full, the line it is in shows up to it, and later lines are hidden.
 * Straight text only: it follows the layout's lines, not a text path or a warp.
 *
 * @example clip: (layout) => wipeClip(layout, frame / 90)
 */
export function wipeClip(layout: Layout, progress: number, options: WipeClipOptions = {}): Box[] {
  const { by = "length", margin = 2 } = options;
  const vertical = isVertical(layout.writingMode);
  const lines = layout.lines;
  if (progress <= 0 || lines.length === 0) return [];

  // How much of each line to show, as a position along it; `Infinity` shows the whole line.
  const reach = new Array<number>(lines.length).fill(-Infinity);
  if (progress >= 1) {
    reach.fill(Infinity);
  } else if (by === "glyph") {
    const visible = layout.glyphs.filter((glyph) => !glyph.isWhitespace);
    if (visible.length === 0) return [];
    const position = progress * visible.length;
    const current = visible[Math.floor(position)]!;
    for (let i = 0; i < current.lineIndex; i++) reach[i] = Infinity;
    const { box } = current;
    const start = vertical ? box.y : box.x;
    reach[current.lineIndex] = start + (position % 1) * (vertical ? box.height : box.width);
  } else {
    let remaining = progress * lines.reduce((sum, line) => sum + line.inlineSize, 0);
    for (const [i, line] of lines.entries()) {
      if (remaining >= line.inlineSize) {
        reach[i] = Infinity;
        remaining -= line.inlineSize;
        continue;
      }
      reach[i] = line.inlineStart + remaining;
      break;
    }
  }

  const boxes: Box[] = [];
  for (const [i, line] of lines.entries()) {
    if (reach[i] === -Infinity) continue;
    const fontSize = Math.max(0, ...layout.glyphs.slice(line.start, line.end).map((glyph) => glyph.fontSize));
    const pad = margin * (fontSize || line.blockSize);
    // Across the lines, each box reaches halfway to its neighbours, or past the text at the first and last line.
    const [from, to] = across(line, vertical);
    let acrossFrom = from - pad;
    let acrossTo = to + pad;
    for (const other of [lines[i - 1], lines[i + 1]]) {
      if (!other) continue;
      const [otherFrom, otherTo] = across(other, vertical);
      if (otherFrom + otherTo < from + to) acrossFrom = (otherTo + from) / 2;
      else acrossTo = (to + otherFrom) / 2;
    }
    // A line the wipe has only reached shows nothing yet, not even the outlines before its first glyph.
    if (reach[i]! <= line.inlineStart) continue;
    const alongFrom = line.inlineStart - pad;
    const alongTo = reach[i] === Infinity ? line.inlineStart + line.inlineSize + pad : reach[i]!;
    boxes.push(
      vertical
        ? { x: acrossFrom, y: alongFrom, width: acrossTo - acrossFrom, height: alongTo - alongFrom }
        : { x: alongFrom, y: acrossFrom, width: alongTo - alongFrom, height: acrossTo - acrossFrom },
    );
  }
  return boxes;
}
