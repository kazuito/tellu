import type { Layout, LayoutGlyph, LayoutLine } from "../layout/layout";
import type { PaintScope } from "../style/types";
import type { Box } from "./paint";

export function glyphBox(glyph: LayoutGlyph): Box {
  return { x: glyph.x, y: glyph.y - glyph.ascent, width: glyph.advance, height: glyph.ascent + glyph.descent };
}

/** The line's ink-relevant box: content width × (ascent + descent). */
export function contentBox(line: LayoutLine): Box {
  return { x: line.x, y: line.baseline - line.ascent, width: line.width, height: line.ascent + line.descent };
}

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
    this.lines = layout.lines.map(contentBox);
    this.block = unionBox(layout.lines.filter((line) => line.end > line.start).map(contentBox));
  }

  get(scope: PaintScope | null, glyph: LayoutGlyph): Box {
    if (scope === "line") return this.lines[glyph.lineIndex]!;
    if (scope === "block") return this.block;
    return glyphBox(glyph);
  }
}
