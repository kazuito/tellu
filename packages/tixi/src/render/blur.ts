/** Taps on each side of the centre in PixiJS's default 5-tap blur kernel. */
const KERNEL_HALF = 2;

/**
 * How far a PixiJS `BlurFilter` spreads, in the same units as its strength. Pixi runs `quality` passes whose
 * strengths halve each time (scaled so the variances add up to `strength`), and each pass samples
 * `KERNEL_HALF` steps of its strength away. Pixi's own padding (`2 × strength`) only covers one pass.
 */
export function blurReach(strength: number, quality: number): number {
  const passes = Math.max(1, Math.round(quality));
  let sumOfSquares = 0;
  let sum = 0;
  for (let i = 0; i < passes; i++) {
    sumOfSquares += 0.25 ** i;
    sum += 0.5 ** i;
  }
  return KERNEL_HALF * Math.abs(strength) * (sum / Math.sqrt(sumOfSquares));
}

/** Integer filter padding (PixiJS truncates it) covering the blur, plus a pixel for linear sampling. */
export function blurPadding(strength: number, quality: number): number {
  return Math.ceil(blurReach(strength, quality)) + 1;
}
