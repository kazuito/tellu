import type {
  BevelShading,
  ColorValue,
  GradientStopInput,
  Layer,
  LinearGradient,
  Paint,
  PaintScope,
  RadialGradient,
  SatinShading,
} from "./types";

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

export function shadow({
  color = "rgba(0,0,0,0.6)",
  offset = [4, 4],
  stroke = 0,
  ...options
}: ShadowOptions = {}): Layer {
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

export interface InnerShadowOptions extends Omit<LayerOptions, "offset" | "shading"> {
  color?: Paint;
  /** `[x, y]` offset of the shadow. Default: `[4, 4]`. */
  offset?: readonly [number, number];
  /** Width of the fade in px. `0` is a hard edge. Default: `4`. */
  size?: number;
  /** Shade the glyph grown by this many px, e.g. an outline. Default: `0`. */
  stroke?: number;
}

export function innerShadow({
  color = "rgba(0,0,0,0.6)",
  offset = [4, 4],
  size = 4,
  stroke = 0,
  ...options
}: InnerShadowOptions = {}): Layer {
  return { ...options, paint: color, stroke, shading: { type: "inset", offset, size } };
}

export interface InnerGlowOptions extends Omit<LayerOptions, "shading"> {
  color?: Paint;
  /** Width of the fade in px. Default: `8`. */
  size?: number;
  /** Light the glyph grown by this many px, e.g. an outline. Default: `0`. */
  stroke?: number;
}

export function innerGlow({ color = "#ffffff", size = 8, stroke = 0, ...options }: InnerGlowOptions = {}): Layer {
  return { ...options, paint: color, stroke, shading: { type: "inset", size } };
}

export interface BevelOptions extends Omit<LayerOptions, "shading">, Omit<BevelShading, "type" | "side"> {
  /** Paint of the faces turned toward the light. Default: `"rgba(255,255,255,0.8)"`. */
  highlight?: Paint;
  /** Paint of the faces turned away from the light. Default: `"rgba(0,0,0,0.5)"`. */
  shadow?: Paint;
  /** Bevel the glyph grown by this many px, e.g. an outline. Default: `0`. */
  stroke?: number;
}

/** Two layers, the highlight and then the shadow side of the bevel. */
export function bevel({
  highlight = "rgba(255,255,255,0.8)",
  shadow = "rgba(0,0,0,0.5)",
  size = 4,
  angle = 315,
  depth = 1,
  technique = "smooth",
  stroke = 0,
  ...options
}: BevelOptions = {}): [highlight: Layer, shadow: Layer] {
  const shading = { type: "bevel", size, angle, depth, technique } as const;
  return [
    { ...options, paint: highlight, stroke, shading: { ...shading, side: "highlight" } },
    { ...options, paint: shadow, stroke, shading: { ...shading, side: "shadow" } },
  ];
}

export interface SatinOptions extends Omit<LayerOptions, "offset" | "shading">, Omit<SatinShading, "type"> {
  color?: Paint;
  /** Shade the glyph grown by this many px, e.g. an outline. Default: `0`. */
  stroke?: number;
}

export function satin({
  color = "rgba(0,0,0,0.5)",
  offset = [4, 4],
  size = 8,
  invert = false,
  stroke = 0,
  ...options
}: SatinOptions = {}): Layer {
  return { ...options, paint: color, stroke, shading: { type: "satin", offset, size, invert } };
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
