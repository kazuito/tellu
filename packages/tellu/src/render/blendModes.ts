import type { BlendMode } from "../style/types";

/**
 * Modes the GPU's blend equation computes exactly on premultiplied colors, against any backdrop, including a
 * transparent one. Every other mode is computed by `BlendFilter` from the pixels below.
 */
const NATIVE = new Set<string>(["normal", "add", "screen", "erase"]);

/** Modes computed by `BlendFilter`, numbered as its shader numbers them. */
export const SHADER_BLEND_MODES = [
  "multiply",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
  "linear-burn",
  "linear-dodge",
  "linear-light",
  "vivid-light",
  "pin-light",
  "hard-mix",
  "subtract",
  "divide",
] as const satisfies readonly BlendMode[];

/**
 * The number `BlendFilter` uses for a mode (from `1`), or `0` when the GPU blends it natively. Unknown names are left
 * to PixiJS, as before.
 */
export function shaderBlendMode(mode: BlendMode | undefined): number {
  if (mode === undefined || NATIVE.has(mode)) return 0;
  return (SHADER_BLEND_MODES as readonly string[]).indexOf(mode) + 1;
}
