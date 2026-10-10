import type { Shading, StrokePosition } from "../style/types";

const FAR = 1e20;

/** Squared Euclidean distance transform (Felzenszwalb & Huttenlocher), in place. */
export function distanceTransform(grid: Float64Array, width: number, height: number): void {
  const size = Math.max(width, height);
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x]!;
    transform1d(f, height, d, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y]!;
  }
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) f[x] = grid[row + x]!;
    transform1d(f, width, d, v, z);
    for (let x = 0; x < width; x++) grid[row + x] = d[x]!;
  }
}

function transform1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -FAR;
  z[1] = FAR;
  for (let q = 1; q < n; q++) {
    let s: number;
    do {
      const r = v[k]!;
      s = (f[q]! + q * q - (f[r]! + r * r)) / (2 * q - 2 * r);
    } while (s <= z[k]! && --k >= 0);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = FAR;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const r = v[k]!;
    d[q] = (q - r) * (q - r) + f[r]!;
  }
}

/** Signed distance in pixels from the shape edge: negative inside, positive outside. */
export function signedDistanceField(alpha: Uint8ClampedArray, width: number, height: number): Float32Array {
  const count = width * height;
  const outside = new Float64Array(count);
  const inside = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const isInside = alpha[i * 4 + 3]! >= 128;
    outside[i] = isInside ? 0 : FAR;
    inside[i] = isInside ? FAR : 0;
  }
  distanceTransform(outside, width, height);
  distanceTransform(inside, width, height);

  const field = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    field[i] = outside[i]! > 0 ? Math.sqrt(outside[i]!) - 0.5 : 0.5 - Math.sqrt(inside[i]!);
  }
  return field;
}

/**
 * Coverage of a stroke band rendered from a supersampled distance field, box-filtered down by `factor`.
 * `shading` scales the coverage of each sample; its lengths are multiplied by `unit` to get field pixels.
 * Returns RGBA pixels (black with coverage in alpha) at the target size.
 */
export function strokeCoverage(
  field: Float32Array,
  fieldWidth: number,
  fieldHeight: number,
  factor: number,
  strokeWidth: number,
  position: StrokePosition,
  shading?: Shading,
  unit = 1,
): Uint8ClampedArray<ArrayBuffer> {
  const width = Math.floor(fieldWidth / factor);
  const height = Math.floor(fieldHeight / factor);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const samples = factor * factor;
  const shade = shading && shadingSampler(field, fieldWidth, fieldHeight, strokeWidth, position, shading, unit);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let total = 0;
      for (let sy = 0; sy < factor; sy++) {
        const fy = y * factor + sy;
        const row = fy * fieldWidth + x * factor;
        for (let sx = 0; sx < factor; sx++) {
          const distance = field[row + sx]!;
          const value =
            position === "outside"
              ? clamp(strokeWidth - distance + 0.5)
              : position === "inside"
                ? clamp(0.5 - distance) * clamp(distance + strokeWidth + 0.5)
                : clamp(strokeWidth / 2 - Math.abs(distance) + 0.5);
          total += shade && value > 0 ? value * shade(x * factor + sx, fy) : value;
        }
      }
      pixels[(y * width + x) * 4 + 3] = Math.round((total / samples) * 255);
    }
  }
  return pixels;
}

function clamp(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** 1 just outside the edge, easing to 0 at `size` inside it. */
function edgeFade(distance: number, size: number): number {
  const x = clamp((distance + size + 0.5) / (size + 1));
  return x * x * (3 - 2 * x);
}

/** Radius in field pixels of the box blur, run twice, that smooths the distance field under a bevel. */
const BEVEL_SMOOTHING = 2;

/** The highlight and shadow layers of a bevel share the smoothed field. */
const smoothedFields = new WeakMap<Float32Array, Float32Array>();

function smoothField(field: Float32Array, width: number, height: number): Float32Array {
  const cached = smoothedFields.get(field);
  if (cached) return cached;
  let source = field;
  for (let pass = 0; pass < 2; pass++) {
    source = boxBlur(source, width, height, BEVEL_SMOOTHING, 1, width);
    source = boxBlur(source, height, width, BEVEL_SMOOTHING, width, 1);
  }
  smoothedFields.set(field, source);
  return source;
}

/** Box blur along one axis: `length` samples `step` apart, in `lines` lines `stride` apart. Edges are clamped. */
function boxBlur(
  source: Float32Array,
  length: number,
  lines: number,
  radius: number,
  step: number,
  stride: number,
): Float32Array {
  const result = new Float32Array(source.length);
  const span = radius * 2 + 1;
  for (let line = 0; line < lines; line++) {
    const start = line * stride;
    const first = source[start]!;
    const last = source[start + (length - 1) * step]!;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += source[start + Math.min(length - 1, Math.max(0, i)) * step]!;
    for (let i = 0; i < length; i++) {
      result[start + i * step] = sum / span;
      const added = i + radius + 1;
      const removed = i - radius;
      sum +=
        (added < length ? source[start + added * step]! : last) -
        (removed > 0 ? source[start + removed * step]! : first);
    }
  }
  return result;
}

/** Strength of `shading` at a field pixel, from 0 to 1. */
function shadingSampler(
  field: Float32Array,
  width: number,
  height: number,
  strokeWidth: number,
  position: StrokePosition,
  shading: Shading,
  unit: number,
): (x: number, y: number) => number {
  const toShape = (distance: number) =>
    position === "outside"
      ? distance - strokeWidth
      : position === "inside"
        ? Math.max(distance, -strokeWidth - distance)
        : Math.abs(distance) - strokeWidth / 2;
  /** Signed distance to the layer's shape, bilinearly sampled; outside the field reads as far outside. */
  const shapeAt = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return Infinity;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const tx = x - x0;
    const ty = y - y0;
    const top = field[y0 * width + x0]! * (1 - tx) + field[y0 * width + x1]! * tx;
    const bottom = field[y1 * width + x0]! * (1 - tx) + field[y1 * width + x1]! * tx;
    return toShape(top * (1 - ty) + bottom * ty);
  };

  if (shading.type === "inset") {
    const [dx, dy] = shading.offset ?? [0, 0];
    const size = (shading.size ?? 4) * unit;
    return (x, y) => edgeFade(shapeAt(x - dx * unit, y - dy * unit), size);
  }

  if (shading.type === "satin") {
    const [dx, dy] = shading.offset ?? [4, 4];
    const size = (shading.size ?? 8) * unit;
    const invert = shading.invert ?? false;
    return (x, y) => {
      const a = edgeFade(shapeAt(x + dx * unit, y + dy * unit), size);
      const b = edgeFade(shapeAt(x - dx * unit, y - dy * unit), size);
      const band = Math.abs(a - b);
      return invert ? 1 - band : band;
    };
  }

  const size = (shading.size ?? 4) * unit;
  const depth = shading.depth ?? 1;
  const chisel = shading.technique === "chisel";
  const sign = shading.side === "shadow" ? -1 : 1;
  const angle = ((shading.angle ?? 315) * Math.PI) / 180;
  const lightX = Math.sin(angle);
  const lightY = -Math.cos(angle);
  // Distances to the binarized edge step along curves, which would streak the lighting.
  const smooth = smoothField(field, width, height);
  const smoothAt = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? Infinity : toShape(smooth[y * width + x]!);
  return (x, y) => {
    const depthInside = -smoothAt(x, y);
    if (!(size > 0) || depthInside >= size) return 0;
    // The slope of the shape distance points along the outward normal of the bevel.
    const gx = smoothAt(x + 1, y) - smoothAt(x - 1, y);
    const gy = smoothAt(x, y + 1) - smoothAt(x, y - 1);
    const length = Math.hypot(gx, gy);
    if (!(length > 1e-6) || !Number.isFinite(length)) return 0;
    const facing = (gx * lightX + gy * lightY) / length;
    const slope = depth * (chisel ? 1 : 2 * (1 - clamp(depthInside / size)));
    return Math.max(0, (sign * facing * slope) / Math.sqrt(1 + slope * slope));
  };
}
