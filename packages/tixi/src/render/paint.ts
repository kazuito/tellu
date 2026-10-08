import type { Canvas2D } from "../canvas";
import type { GradientStop, GradientStopInput, Paint, PaintScope } from "../style/types";
import { objectId } from "../utils/stableKey";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function colorToCss(color: string | number): string {
  return typeof color === "number" ? `#${(color & 0xffffff).toString(16).padStart(6, "0")}` : color;
}

export function normalizeStop(stop: GradientStopInput): GradientStop {
  return "offset" in stop ? stop : { offset: stop[0], color: stop[1] };
}

/** The box this paint is stretched over, or `null` for solid colors. */
export function paintScope(paint: Paint): PaintScope | null {
  if (typeof paint !== "object") return null;
  return paint.scope ?? (paint.type === "pattern" ? "block" : "line");
}

export function paintKey(paint: Paint): string {
  if (typeof paint !== "object") return colorToCss(paint);
  if (paint.type === "pattern")
    return `pattern#${objectId(paint.source)}:${paint.repetition}:${paint.scale}:${paint.offset}`;
  return JSON.stringify(paint);
}

export function createPaintStyle(ctx: Canvas2D, paint: Paint, box: Box): string | CanvasGradient | CanvasPattern {
  if (typeof paint !== "object") return colorToCss(paint);

  if (paint.type === "pattern") {
    const pattern = ctx.createPattern(paint.source, paint.repetition ?? "repeat");
    if (!pattern) return "transparent";
    const scale = paint.scale ?? 1;
    const [dx, dy] = paint.offset ?? [0, 0];
    pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, box.x + dx, box.y + dy]));
    return pattern;
  }

  let gradient: CanvasGradient;
  if (paint.type === "linear") {
    const angle = (((paint.angle ?? 180) % 360) * Math.PI) / 180;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const half = (Math.abs(box.width * dx) + Math.abs(box.height * dy)) / 2;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    gradient = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  } else {
    const [rx, ry] = paint.center ?? [0.5, 0.5];
    const cx = box.x + rx * box.width;
    const cy = box.y + ry * box.height;
    const farthest = Math.max(
      Math.hypot(cx - box.x, cy - box.y),
      Math.hypot(cx - box.x - box.width, cy - box.y),
      Math.hypot(cx - box.x, cy - box.y - box.height),
      Math.hypot(cx - box.x - box.width, cy - box.y - box.height),
    );
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(farthest * (paint.radius ?? 1), 0.001));
  }
  for (const stop of paint.stops) {
    const { offset, color } = normalizeStop(stop);
    gradient.addColorStop(Math.min(1, Math.max(0, offset)), colorToCss(color));
  }
  return gradient;
}
