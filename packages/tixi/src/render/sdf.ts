import type { StrokePosition } from "../style/types";

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
 * Returns RGBA pixels (black with coverage in alpha) at the target size.
 */
export function strokeCoverage(
  field: Float32Array,
  fieldWidth: number,
  fieldHeight: number,
  factor: number,
  strokeWidth: number,
  position: StrokePosition,
): Uint8ClampedArray<ArrayBuffer> {
  const width = Math.floor(fieldWidth / factor);
  const height = Math.floor(fieldHeight / factor);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const samples = factor * factor;
  const clamp = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let total = 0;
      for (let sy = 0; sy < factor; sy++) {
        const row = (y * factor + sy) * fieldWidth + x * factor;
        for (let sx = 0; sx < factor; sx++) {
          const distance = field[row + sx]!;
          total +=
            position === "outside"
              ? clamp(strokeWidth - distance + 0.5)
              : position === "inside"
                ? clamp(0.5 - distance) * clamp(distance + strokeWidth + 0.5)
                : clamp(strokeWidth / 2 - Math.abs(distance) + 0.5);
        }
      }
      pixels[(y * width + x) * 4 + 3] = Math.round((total / samples) * 255);
    }
  }
  return pixels;
}
