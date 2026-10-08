import { context2d, createCanvas, type AnyCanvas } from "../canvas";
import type { Layout } from "../layout/layout";
import type { PlateStyle } from "../style/types";
import { createPaintStyle, type Box } from "./paint";
import { contentBox, unionBox } from "./scope";

export function platePadding(style: PlateStyle): [number, number] {
  const { padding = [24, 12] } = style;
  return typeof padding === "number" ? [padding, padding] : [padding[0], padding[1]];
}

/** Plate rectangles in layout coordinates. */
export function plateBoxes(layout: Layout, style: PlateStyle): Box[] {
  const [px, py] = platePadding(style);
  const lines = layout.lines.filter((line) => line.end > line.start).map(contentBox);
  if (lines.length === 0) return [];
  const boxes = style.mode === "line" ? lines : [unionBox(lines)];
  return boxes.map((box) => ({ x: box.x - px, y: box.y - py, width: box.width + px * 2, height: box.height + py * 2 }));
}

export function rasterizePlate(style: PlateStyle, boxes: readonly Box[], resolution: number): { canvas: AnyCanvas; x: number; y: number } {
  const strokeWidth = style.stroke?.width ?? 0;
  const bounds = unionBox(boxes);
  const margin = strokeWidth / 2 + 1;
  const x = Math.floor((bounds.x - margin) * resolution) / resolution;
  const y = Math.floor((bounds.y - margin) * resolution) / resolution;
  const width = Math.max(1, Math.ceil((bounds.x + bounds.width + margin - x) * resolution));
  const height = Math.max(1, Math.ceil((bounds.y + bounds.height + margin - y) * resolution));

  const canvas = createCanvas(width, height);
  const ctx = context2d(canvas);
  ctx.setTransform(resolution, 0, 0, resolution, -x * resolution, -y * resolution);
  const radius = Math.max(0, style.radius ?? 0);

  for (const box of boxes) {
    const scope = style.mode === "line" ? box : bounds;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.width, box.height, Math.min(radius, box.width / 2, box.height / 2));
    ctx.fillStyle = createPaintStyle(ctx, style.paint, scope);
    ctx.fill();
    if (style.stroke && strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = createPaintStyle(ctx, style.stroke.paint, scope);
      ctx.stroke();
    }
  }
  return { canvas, x, y };
}
