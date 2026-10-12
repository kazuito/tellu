import type { Layout, LayoutGlyph } from "../layout/layout";
import type { Box, PaintScope } from "../style/types";

export function unionBox(boxes: readonly Box[]): Box {
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Resolves paint scope boxes for a layout. */
export class ScopeBoxes {
  private lines: Box[];
  private block: Box;

  constructor(layout: Layout) {
    this.lines = layout.lines.map((line) => line.contentBox);
    this.block = unionBox(layout.lines.filter((line) => line.end > line.start).map((line) => line.contentBox));
  }

  get(scope: PaintScope | null, glyph: LayoutGlyph): Box {
    if (scope === "line") return this.lines[glyph.lineIndex]!;
    if (scope === "block") return this.block;
    return glyph.box;
  }

  /**
   * The scope box of a line decoration's band. Its glyph scope spans the band along the line and the line's content
   * across it, so a gradient meets the line where it would meet glyphs there.
   */
  forBand(scope: PaintScope | null, lineIndex: number, band: Box, vertical: boolean): Box {
    const line = this.lines[lineIndex]!;
    if (scope === "line") return line;
    if (scope === "block") return this.block;
    return vertical
      ? { x: line.x, y: band.y, width: line.width, height: band.height }
      : { x: band.x, y: line.y, width: band.width, height: line.height };
  }
}
