import type { Contour, ContourPreset } from "../style/types";

/** Samples of a contour curve, evenly spaced over inputs 0 … 1. */
export const CONTOUR_SAMPLES = 64;

const PRESETS: Record<ContourPreset, (x: number) => number> = {
  linear: (x) => x,
  cone: (x) => 1 - Math.abs(2 * x - 1),
  "cone-inverted": (x) => Math.abs(2 * x - 1),
  gaussian: (x) => 0.5 - 0.5 * Math.cos(Math.PI * x),
  "half-round": (x) => Math.sqrt(1 - (1 - x) * (1 - x)),
  ring: (x) => Math.sin(Math.PI * x),
  "ring-double": (x) => Math.sin(2 * Math.PI * x) ** 2,
  sawtooth: (x) => (x >= 1 ? 1 : (2 * x) % 1),
};

/**
 * A smooth curve through points `[input, output]`: cubic Hermite segments with Catmull-Rom tangents, flat before the
 * first point and after the last. Outputs are clamped to 0 … 1.
 */
export function curveThrough(points: readonly (readonly [number, number])[]): (x: number) => number {
  const sorted = [...points]
    .map(([x, y]) => [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))] as const)
    .sort((a, b) => a[0] - b[0]);
  if (sorted.length === 0) return (x) => x;
  if (sorted.length === 1) return () => sorted[0]![1];
  const n = sorted.length;
  const tangents = sorted.map((_, i) => {
    const [x0, y0] = sorted[Math.max(0, i - 1)]!;
    const [x1, y1] = sorted[Math.min(n - 1, i + 1)]!;
    return x1 > x0 ? (y1 - y0) / (x1 - x0) : 0;
  });
  return (x) => {
    if (x <= sorted[0]![0]) return sorted[0]![1];
    if (x >= sorted[n - 1]![0]) return sorted[n - 1]![1];
    let i = 0;
    while (sorted[i + 1]![0] < x) i++;
    const [x0, y0] = sorted[i]!;
    const [x1, y1] = sorted[i + 1]!;
    const h = x1 - x0;
    if (h <= 0) return y1;
    const t = (x - x0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const y =
      (2 * t3 - 3 * t2 + 1) * y0 +
      (t3 - 2 * t2 + t) * h * tangents[i]! +
      (-2 * t3 + 3 * t2) * y1 +
      (t3 - t2) * h * tangents[i + 1]!;
    return Math.min(1, Math.max(0, y));
  };
}

/** The curve of a contour, as a function from 0 … 1 to 0 … 1. */
export function contourFunction(contour: Contour): (x: number) => number {
  if (typeof contour === "string") {
    const preset = PRESETS[contour];
    if (!preset) throw new Error(`tellu: unknown contour "${contour}"`);
    return preset;
  }
  return curveThrough(contour);
}

/** A contour sampled at `CONTOUR_SAMPLES` evenly spaced inputs from 0 to 1. */
export function sampleContour(contour: Contour): Float32Array {
  const curve = contourFunction(contour);
  const samples = new Float32Array(CONTOUR_SAMPLES);
  for (let i = 0; i < CONTOUR_SAMPLES; i++) samples[i] = curve(i / (CONTOUR_SAMPLES - 1));
  return samples;
}

/** Reads sampled contour values at `x`, interpolating linearly, as the shader does. */
export function readContour(samples: Float32Array, x: number): number {
  const position = Math.min(1, Math.max(0, x)) * (samples.length - 1);
  const i = Math.min(samples.length - 2, Math.floor(position));
  const t = position - i;
  return samples[i]! * (1 - t) + samples[i + 1]! * t;
}
