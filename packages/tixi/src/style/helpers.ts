import type { ColorValue, GradientStopInput, Layer, LinearGradient, Paint, PaintScope, RadialGradient } from "./types";

type LayerOptions = Omit<Layer, "paint" | "stroke">;

export function fill(paint: Paint, options?: LayerOptions): Layer {
  return { ...options, paint, stroke: 0 };
}

export function stroke(width: number, paint: Paint, options?: LayerOptions): Layer {
  return { ...options, paint, stroke: width };
}

export interface ShadowOptions extends Omit<LayerOptions, "offset"> {
  color?: Paint;
  /** `[x, y]` offset. Default: `[4, 4]`. */
  offset?: readonly [number, number];
  /** Grow the shadow shape, e.g. to cast the shadow of an outline. Default: `0`. */
  stroke?: number;
}

export function shadow({ color = "rgba(0,0,0,0.6)", offset = [4, 4], stroke = 0, ...options }: ShadowOptions = {}): Layer {
  return { blur: 4, ...options, paint: color, stroke, offset };
}

export interface GlowOptions extends LayerOptions {
  color?: Paint;
  /** Default: `8`. */
  stroke?: number;
}

export function glow({ color = "#ffffff", stroke = 8, ...options }: GlowOptions = {}): Layer {
  return { blur: 8, ...options, paint: color, stroke };
}

export function linearGradient(
  stops: readonly GradientStopInput[] | readonly ColorValue[],
  options: { angle?: number; scope?: PaintScope } = {},
): LinearGradient {
  return { type: "linear", ...options, stops: normalizeStopInput(stops) };
}

export function radialGradient(
  stops: readonly GradientStopInput[] | readonly ColorValue[],
  options: { center?: readonly [number, number]; radius?: number; scope?: PaintScope } = {},
): RadialGradient {
  return { type: "radial", ...options, stops: normalizeStopInput(stops) };
}

/** Plain colors are spread evenly from 0 to 1. */
function normalizeStopInput(stops: readonly GradientStopInput[] | readonly ColorValue[]): readonly GradientStopInput[] {
  return stops.map((stop, index) =>
    typeof stop === "string" || typeof stop === "number"
      ? ([stops.length === 1 ? 0 : index / (stops.length - 1), stop] as const)
      : stop,
  );
}
