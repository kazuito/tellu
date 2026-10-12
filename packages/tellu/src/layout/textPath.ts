import { resolveLength } from "../style/defaults";
import type { Box, TextPath } from "../style/types";
import type { Layout } from "./layout";
import { arcSampler, type PathPoint, type PathSampler, svgPathSampler } from "./path";

/** The sampler of a text path. */
export function textPathSampler(path: TextPath): PathSampler {
  if (path.arc) return arcSampler(path.arc);
  if (path.d !== undefined) return svgPathSampler(path.d);
  throw new Error("tellu: textPath needs `d` or `arc`");
}

const DEG = Math.PI / 180;

/** An angle in degrees, in `(-180, 180]`. */
function normalizeDegrees(degrees: number): number {
  const turned = degrees % 360;
  const normalized = turned > 180 ? turned - 360 : turned <= -180 ? turned + 360 : turned;
  // Round off the floating-point noise of a full turn (e.g. 359.99999999999994).
  return Math.abs(normalized) < 1e-9 ? 0 : normalized;
}

/**
 * Moves the glyphs of a horizontal layout onto a path. Each glyph keeps its place along the line as a distance along
 * the path, measured at the middle of its cell on the baseline, and turns with the path there; later lines follow the
 * path at their distance from the first line's baseline. The layout box becomes the bounds of the placed cells, moved
 * to the origin, and each line's `contentBox` the bounds of its own. Decorations aren't placed along paths.
 */
export function placeOnPath(layout: Layout, sampler: PathSampler, path: TextPath, fontSize: number): Layout {
  const start = resolveLength(path.startOffset ?? 0, fontSize);
  const reverse = path.side === "right";
  const pointAt = (distance: number): PathPoint => {
    if (!reverse) return sampler.pointAt(start + distance);
    const point = sampler.pointAt(sampler.length - start - distance);
    return { ...point, angle: point.angle + Math.PI };
  };
  const firstBaseline = layout.lines[0]?.baseline ?? 0;

  const glyphs = layout.glyphs.map((glyph) => {
    const line = layout.lines[glyph.lineIndex]!;
    const middle = glyph.box.x + glyph.box.width / 2;
    const { x, y, angle } = pointAt(middle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotate = (dx: number, dy: number): [number, number] => [dx * cos - dy * sin, dx * sin + dy * cos];
    // Lines after the first follow the path at their distance from it, along its normal.
    const [px, py] = rotate(0, line.baseline - firstBaseline);
    const pivotX = x + px;
    const pivotY = y + py;
    const [ox, oy] = rotate(glyph.x - middle, glyph.y - line.baseline);
    const [cx, cy] = rotate(0, glyph.box.y + glyph.box.height / 2 - line.baseline);
    const { width, height } = glyph.box;
    return {
      ...glyph,
      x: pivotX + ox,
      y: pivotY + oy,
      angle: normalizeDegrees(angle / DEG),
      box: { x: pivotX + cx - width / 2, y: pivotY + cy - height / 2, width, height },
    };
  });

  // Bounds of the turned cells, per line and overall.
  const lineBounds = layout.lines.map((): Box | null => null);
  const grow = (bounds: Box | null, x: number, y: number): Box =>
    bounds
      ? {
          x: Math.min(bounds.x, x),
          y: Math.min(bounds.y, y),
          width: Math.max(bounds.x + bounds.width, x) - Math.min(bounds.x, x),
          height: Math.max(bounds.y + bounds.height, y) - Math.min(bounds.y, y),
        }
      : { x, y, width: 0, height: 0 };
  for (const glyph of glyphs) {
    if (glyph.isWhitespace) continue;
    const { x, y, width, height } = glyph.box;
    const cos = Math.cos(glyph.angle * DEG);
    const sin = Math.sin(glyph.angle * DEG);
    const cx = x + width / 2;
    const cy = y + height / 2;
    for (const [dx, dy] of [
      [-width / 2, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ] as const) {
      lineBounds[glyph.lineIndex] = grow(
        lineBounds[glyph.lineIndex]!,
        cx + dx * cos - dy * sin,
        cy + dx * sin + dy * cos,
      );
    }
  }
  const all = lineBounds.filter((bounds): bounds is Box => bounds !== null);
  const minX = all.length > 0 ? Math.min(...all.map((bounds) => bounds.x)) : 0;
  const minY = all.length > 0 ? Math.min(...all.map((bounds) => bounds.y)) : 0;
  const maxX = all.length > 0 ? Math.max(...all.map((bounds) => bounds.x + bounds.width)) : 0;
  const maxY = all.length > 0 ? Math.max(...all.map((bounds) => bounds.y + bounds.height)) : 0;

  return {
    ...layout,
    glyphs: glyphs.map((glyph) => ({
      ...glyph,
      x: glyph.x - minX,
      y: glyph.y - minY,
      box: { ...glyph.box, x: glyph.box.x - minX, y: glyph.box.y - minY },
    })),
    lines: layout.lines.map((line, index) => {
      const bounds = lineBounds[index];
      return {
        ...line,
        contentBox: bounds
          ? { ...bounds, x: bounds.x - minX, y: bounds.y - minY }
          : { x: 0, y: 0, width: 0, height: 0 },
      };
    }),
    width: maxX - minX,
    height: maxY - minY,
    decorations: [],
  };
}
