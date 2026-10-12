import { type AnyCanvas, type Canvas2D, context2d, createCanvas } from "../canvas";
import type { Layout } from "../layout/layout";
import { isVertical } from "../layout/vertical";
import type { Box, Paint, PlateStyle, WritingMode } from "../style/types";
import { createPaintStyle } from "./paint";
import { unionBox } from "./scope";

export function platePadding(style: PlateStyle, writingMode?: WritingMode): [number, number] {
  const { padding = isVertical(writingMode) ? [12, 24] : [24, 12] } = style;
  return typeof padding === "number" ? [padding, padding] : [padding[0], padding[1]];
}

/** Plate rectangles in layout coordinates. */
export function plateBoxes(layout: Layout, style: PlateStyle): Box[] {
  const [px, py] = platePadding(style, layout.writingMode);
  const lines = layout.lines.filter((line) => line.end > line.start).map((line) => line.contentBox);
  if (lines.length === 0) return [];
  const boxes = style.mode === "line" ? lines : [unionBox(lines)];
  return boxes.map((box) => ({ x: box.x - px, y: box.y - py, width: box.width + px * 2, height: box.height + py * 2 }));
}

/** How boxes are drawn: plates and box decorations. */
export interface BoxStyle {
  paint?: Paint;
  stroke?: { width: number; paint: Paint };
  radius?: number;
  skew?: number;
}

/** A box to draw, and the box its paint is stretched over. */
export interface PaintedBox {
  box: Box;
  scope: Box;
}

/**
 * Corners of a box slanted by `skew` degrees: its over edge (the top, or the right in vertical text) moves toward the
 * end of the lines and its under edge toward their start, each by half the slant.
 */
export function skewedCorners(box: Box, skew: number, vertical: boolean): [number, number][] {
  const { x, y, width, height } = box;
  const tan = Math.tan((skew * Math.PI) / 180);
  if (vertical) {
    const shift = (tan * width) / 2;
    return [
      [x + width, y + shift],
      [x + width, y + height + shift],
      [x, y + height - shift],
      [x, y - shift],
    ];
  }
  const shift = (tan * height) / 2;
  return [
    [x + shift, y],
    [x + width + shift, y],
    [x + width - shift, y + height],
    [x - shift, y + height],
  ];
}

function tracePolygon(ctx: Canvas2D, corners: readonly [number, number][], radius: number): void {
  const n = corners.length;
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const shortest = Math.min(
    ...corners.map((corner, i) =>
      Math.hypot(corners[(i + 1) % n]![0] - corner[0], corners[(i + 1) % n]![1] - corner[1]),
    ),
  );
  const r = Math.max(0, Math.min(radius, shortest / 2));
  ctx.moveTo(...mid(corners[n - 1]!, corners[0]!));
  corners.forEach((corner, i) => {
    const next = mid(corner, corners[(i + 1) % n]!);
    ctx.arcTo(corner[0], corner[1], next[0], next[1], r);
  });
  ctx.closePath();
}

/** Adds a box, rounded and slanted, to the current path. */
function traceBox(ctx: Canvas2D, box: Box, radius: number, skew: number, vertical: boolean): void {
  if (skew === 0) {
    ctx.roundRect(box.x, box.y, box.width, box.height, Math.min(radius, box.width / 2, box.height / 2));
    return;
  }
  // A slanted box is as thick as the unslanted one, so the radius is clamped the same way.
  tracePolygon(ctx, skewedCorners(box, skew, vertical), Math.min(radius, box.width / 2, box.height / 2));
}

/** Draws boxes into one canvas. Returns the canvas and its top-left in layout coordinates. */
export function rasterizeBoxes(
  style: BoxStyle,
  boxes: readonly PaintedBox[],
  resolution: number,
  vertical: boolean,
): { canvas: AnyCanvas; x: number; y: number } {
  const strokeWidth = style.stroke?.width ?? 0;
  const skew = style.skew ?? 0;
  const outlines = boxes.map(({ box }) => {
    if (skew === 0) return box;
    const corners = skewedCorners(box, skew, vertical);
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  });
  const bounds = unionBox(outlines);
  const margin = strokeWidth / 2 + 1;
  const x = Math.floor((bounds.x - margin) * resolution) / resolution;
  const y = Math.floor((bounds.y - margin) * resolution) / resolution;
  const width = Math.max(1, Math.ceil((bounds.x + bounds.width + margin - x) * resolution));
  const height = Math.max(1, Math.ceil((bounds.y + bounds.height + margin - y) * resolution));

  const canvas = createCanvas(width, height);
  const ctx = context2d(canvas);
  ctx.setTransform(resolution, 0, 0, resolution, -x * resolution, -y * resolution);
  const radius = Math.max(0, style.radius ?? 0);

  for (const { box, scope } of boxes) {
    ctx.beginPath();
    traceBox(ctx, box, radius, skew, vertical);
    if (style.paint !== undefined) {
      ctx.fillStyle = createPaintStyle(ctx, style.paint, scope);
      ctx.fill();
    }
    if (style.stroke && strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = createPaintStyle(ctx, style.stroke.paint, scope);
      ctx.stroke();
    }
  }
  return { canvas, x, y };
}

export function rasterizePlate(
  style: PlateStyle,
  boxes: readonly Box[],
  resolution: number,
  vertical = false,
): { canvas: AnyCanvas; x: number; y: number } {
  const bounds = unionBox(boxes);
  const painted = boxes.map((box) => ({ box, scope: style.mode === "line" ? box : bounds }));
  return rasterizeBoxes(style, painted, resolution, vertical);
}
