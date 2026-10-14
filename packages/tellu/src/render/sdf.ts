import type { ResolvedShading } from "../style/resolve";
import type { StrokePosition } from "../style/types";
import { readContour, sampleContour } from "./contour";

const FAR = 1e20;

/**
 * Euclidean distance transform (Felzenszwalb & Huttenlocher) of the pixels on one side of a field's edge:
 * writes `sqrt(d) - 0.5` outside or `0.5 - sqrt(d)` inside, where `d` is the squared distance to the
 * nearest pixel on the other side. Only the sign of the field is read, and the other side is left alone.
 */
function measureSide(field: Float32Array, width: number, height: number, inside: boolean): void {
  // The input is binary, so the pass along columns is the distance to the nearest pixel across the edge
  // in the same column: one scan down and one up, row by row so memory is read in order.
  const column = new Float32Array(width * height);
  for (let i = 0; i < width; i++) column[i] = field[i]! < 0 !== inside ? 0 : FAR;
  for (let i = width; i < column.length; i++) column[i] = field[i]! < 0 !== inside ? 0 : column[i - width]! + 1;
  for (let i = column.length - width - 1; i >= 0; i--) {
    const below = column[i + width]! + 1;
    if (below < column[i]!) column[i] = below;
  }

  const f = new Float64Array(width);
  const d = new Float64Array(width);
  const v = new Int32Array(width);
  const z = new Float64Array(width + 1);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const distance = column[row + x]!;
      f[x] = distance < FAR ? distance * distance : FAR;
    }
    transform1d(f, width, d, v, z);
    for (let x = 0; x < width; x++) {
      if (field[row + x]! < 0 !== inside) continue;
      field[row + x] = inside ? 0.5 - Math.sqrt(d[x]!) : Math.sqrt(d[x]!) - 0.5;
    }
  }
}

/**
 * Lower envelope of the parabolas `(x - q)² + f[q]`. Pixels with nothing across the edge in their column
 * (`FAR`) are left out: their parabolas never reach below another one inside the row.
 */
function transform1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = -1;
  for (let q = 0; q < n; q++) {
    if (f[q]! >= FAR) continue;
    const fq = f[q]! + q * q;
    let s = -FAR;
    while (k >= 0) {
      const r = v[k]!;
      s = (fq - (f[r]! + r * r)) / (2 * q - 2 * r);
      if (s > z[k]!) break;
      k--;
    }
    k++;
    v[k] = q;
    z[k] = k === 0 ? -FAR : s;
  }
  if (k < 0) {
    d.fill(FAR, 0, n);
    return;
  }
  z[k + 1] = FAR;
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const r = v[k]!;
    d[q] = (q - r) * (q - r) + f[r]!;
  }
}

/**
 * Signed distance in pixels from the shape edge: negative inside, positive outside.
 * With `inside: false`, every pixel inside reads `-0.5` until `measureInside` fills in its distance:
 * enough for shapes grown outward, which cover the whole inside.
 */
export function signedDistanceField(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  inside = true,
): Float32Array {
  const field = new Float32Array(width * height);
  for (let i = 0; i < field.length; i++) field[i] = alpha[i * 4 + 3]! >= 128 ? -0.5 : 0.5;
  measureSide(field, width, height, false);
  if (inside) measureSide(field, width, height, true);
  return field;
}

/** Fills in the distances inside the shape of a field made with `inside: false`. */
export function measureInside(field: Float32Array, width: number, height: number): void {
  measureSide(field, width, height, true);
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
  shading?: ResolvedShading,
  unit = 1,
): Uint8ClampedArray<ArrayBuffer> {
  const width = Math.floor(fieldWidth / factor);
  const height = Math.floor(fieldHeight / factor);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const samples = factor * factor;
  const sampler = shading && shadingSampler(field, fieldWidth, fieldHeight, strokeWidth, position, shading, unit);
  const curve = shading?.contour === undefined ? undefined : sampleContour(shading.contour);
  const shade = sampler && curve ? (x: number, y: number) => readContour(curve, sampler(x, y)) : sampler;

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

/**
 * Where each output pixel falls in a shape gradient, from `0` at the glyph's edge to `1` at the far edge of the
 * layer's shape: the outer edge of an outside stroke, the inner edge of an inside one, the outer edge of a centered one
 * (from its inner edge), or `size` inside the glyph for a fill. Distances are averaged over each pixel's samples.
 * `strokeWidth` and `size` are in field pixels.
 */
export function shapeOffsets(
  field: Float32Array,
  fieldWidth: number,
  fieldHeight: number,
  factor: number,
  strokeWidth: number,
  position: StrokePosition,
  size: number,
): Float32Array {
  const width = Math.floor(fieldWidth / factor);
  const height = Math.floor(fieldHeight / factor);
  const offsets = new Float32Array(width * height);
  const samples = factor * factor;
  const toOffset =
    position === "outside" && strokeWidth > 0
      ? (distance: number) => distance / strokeWidth
      : position === "outside"
        ? (distance: number) => -distance / Math.max(size, 1e-6)
        : position === "inside"
          ? (distance: number) => -distance / Math.max(strokeWidth, 1e-6)
          : (distance: number) => (distance + strokeWidth / 2) / Math.max(strokeWidth, 1e-6);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let total = 0;
      for (let sy = 0; sy < factor; sy++) {
        const row = (y * factor + sy) * fieldWidth + x * factor;
        for (let sx = 0; sx < factor; sx++) total += field[row + sx]!;
      }
      offsets[y * width + x] = clamp(toOffset(total / samples));
    }
  }
  return offsets;
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
  shading: ResolvedShading,
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
