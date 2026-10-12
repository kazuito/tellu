import { type Canvas2D, context2d, createCanvas } from "../canvas";
import type { Box, DiamondGradient, GradientStop, GradientStopInput, Paint, PaintScope } from "../style/types";
import { objectId } from "../utils/stableKey";

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

/**
 * The stops of a reflected gradient: the original stops run from the middle (`0`) out to both ends (`1`), mirrored on
 * the first half. Stops are clamped to 0 … 1 and keep their order, so hard stops stay hard.
 */
export function reflectStops(stops: readonly GradientStopInput[]): GradientStop[] {
  const normalized = stops.map(normalizeStop).map(({ offset, color }) => ({
    offset: Math.min(1, Math.max(0, offset)),
    color,
  }));
  return [
    ...normalized.toReversed().map(({ offset, color }) => ({ offset: 0.5 - offset / 2, color })),
    ...normalized.map(({ offset, color }) => ({ offset: 0.5 + offset / 2, color })),
  ];
}

export function addColorStops(gradient: CanvasGradient, stops: readonly GradientStopInput[]): void {
  for (const stop of stops) {
    const { offset, color } = normalizeStop(stop);
    gradient.addColorStop(Math.min(1, Math.max(0, offset)), colorToCss(color));
  }
}

/** Entries in a color ramp. */
export const RAMP_SIZE = 1024;

const ramps = new Map<string, Uint8ClampedArray>();

/**
 * The colors of a gradient's stops at `RAMP_SIZE` evenly spaced offsets from 0 to 1, as unpremultiplied RGBA. Drawn
 * with a Canvas 2D gradient, so computed gradients interpolate like the native ones.
 */
export function colorRamp(stops: readonly GradientStopInput[]): Uint8ClampedArray {
  const key = JSON.stringify(stops);
  let ramp = ramps.get(key);
  if (!ramp) {
    const ctx = context2d(createCanvas(RAMP_SIZE, 1));
    // Pixel centers fall on offsets 0 … 1.
    const gradient = ctx.createLinearGradient(0.5, 0, RAMP_SIZE - 0.5, 0);
    addColorStops(gradient, stops);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, RAMP_SIZE, 1);
    ramp = ctx.getImageData(0, 0, RAMP_SIZE, 1).data;
    if (ramps.size >= 64) ramps.delete(ramps.keys().next().value!);
    ramps.set(key, ramp);
  }
  return ramp;
}

/** Index into a color ramp (in entries, not bytes) of offset `t`, clamped to 0 … 1. */
export function rampIndex(t: number): number {
  return Math.round((t <= 0 ? 0 : t >= 1 ? 1 : t) * (RAMP_SIZE - 1));
}

/** The offset of a diamond gradient at a point: `0` at the center, `1` on the diamond through the farthest corner. */
export function diamondOffset(paint: DiamondGradient, box: Box): (x: number, y: number) => number {
  const [rx, ry] = paint.center ?? [0.5, 0.5];
  const cx = box.x + rx * box.width;
  const cy = box.y + ry * box.height;
  const angle = ((paint.angle ?? 0) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Distance in the diamond's own frame: |u| + |v| after turning the point back by `angle`.
  const distance = (x: number, y: number) => {
    const dx = x - cx;
    const dy = y - cy;
    return Math.abs(dx * cos + dy * sin) + Math.abs(-dx * sin + dy * cos);
  };
  const farthest = Math.max(
    distance(box.x, box.y),
    distance(box.x + box.width, box.y),
    distance(box.x, box.y + box.height),
    distance(box.x + box.width, box.y + box.height),
  );
  const size = Math.max(farthest * (paint.radius ?? 1), 0.001);
  return (x, y) => distance(x, y) / size;
}

/**
 * A gradient Canvas 2D can't draw, computed per pixel over the whole canvas of `ctx` and returned as a pattern that
 * lines up with its pixels under the current transform.
 */
function computedGradient(
  ctx: Canvas2D,
  offsetAt: (x: number, y: number) => number,
  stops: readonly GradientStopInput[],
) {
  const { width, height } = ctx.canvas;
  const toLocal = ctx.getTransform().inverse();
  const ramp = colorRamp(stops);
  const image = new ImageData(width, height);
  const { data } = image;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const x = toLocal.a * (px + 0.5) + toLocal.c * (py + 0.5) + toLocal.e;
      const y = toLocal.b * (px + 0.5) + toLocal.d * (py + 0.5) + toLocal.f;
      const from = rampIndex(offsetAt(x, y)) * 4;
      const to = (py * width + px) * 4;
      data[to] = ramp[from]!;
      data[to + 1] = ramp[from + 1]!;
      data[to + 2] = ramp[from + 2]!;
      data[to + 3] = ramp[from + 3]!;
    }
  }
  const canvas = createCanvas(width, height);
  context2d(canvas).putImageData(image, 0, 0);
  const pattern = ctx.createPattern(canvas, "no-repeat");
  if (!pattern) return "transparent";
  pattern.setTransform(toLocal);
  return pattern;
}

/**
 * A fill or stroke style for `paint` stretched over `box`, in the current coordinates of `ctx`. Computed gradients
 * cover the whole canvas of `ctx`, so set the transform first.
 */
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

  if (paint.type === "diamond") return computedGradient(ctx, diamondOffset(paint, box), paint.stops);

  let gradient: CanvasGradient;
  let stops = paint.stops;
  if (paint.type === "linear") {
    const angle = (((paint.angle ?? 180) % 360) * Math.PI) / 180;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const half = (Math.abs(box.width * dx) + Math.abs(box.height * dy)) / 2;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    gradient = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    if (paint.reflect) stops = reflectStops(stops);
  } else if (paint.type === "conic") {
    const [rx, ry] = paint.center ?? [0.5, 0.5];
    // Canvas starts at 3 o'clock, CSS at 12 o'clock.
    const start = (((paint.angle ?? 0) - 90) * Math.PI) / 180;
    gradient = ctx.createConicGradient(start, box.x + rx * box.width, box.y + ry * box.height);
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
  addColorStops(gradient, stops);
  return gradient;
}
