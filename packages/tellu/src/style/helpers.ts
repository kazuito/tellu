import type {
  BevelShading,
  ColorValue,
  ConicGradient,
  DiamondGradient,
  GradientStopInput,
  Layer,
  LinearGradient,
  Paint,
  PaintScope,
  RadialGradient,
  SatinShading,
} from "./types";

type LayerOptions = Omit<Layer, "paint" | "stroke">;

/**
 * A layer that paints the glyph itself.
 *
 * @example fill(linearGradient(["#fff6c0", "#f5b400"]))
 */
export function fill(paint: Paint, options?: LayerOptions): Layer {
  return { ...options, paint, stroke: 0 };
}

/**
 * An outline: the glyph grown by `width` px. Put it below the fill; `options.strokePosition` makes inside or centered
 * strokes.
 *
 * @example layers: [stroke(16, "#000"), stroke(8, "#e60033"), fill("#fff")]
 */
export function stroke(width: number, paint: Paint, options?: LayerOptions): Layer {
  return { ...options, paint, stroke: width };
}

export interface ShadowOptions extends Omit<LayerOptions, "offset"> {
  /** Default: `"rgba(0,0,0,0.6)"`. */
  color?: Paint;
  /** `[x, y]` offset in px. Default: `[4, 4]`. */
  offset?: readonly [number, number];
  /** Grow the shadow shape, e.g. to cast the shadow of an outline. Default: `0`. */
  stroke?: number;
  /** Default: `4`. */
  blur?: number;
}

/**
 * A drop shadow: the glyph, offset and blurred. Put it first so it sits below the other layers; give it the width of
 * the widest outline as `stroke` to cast the outline's shadow.
 *
 * @example layers: [shadow({ stroke: 12, offset: [6, 6] }), stroke(12, "#000"), fill("#fff")]
 */
export function shadow({
  color = "rgba(0,0,0,0.6)",
  offset = [4, 4],
  stroke = 0,
  ...options
}: ShadowOptions = {}): Layer {
  return { blur: 4, ...options, paint: color, stroke, offset };
}

export interface GlowOptions extends LayerOptions {
  /** Default: `"#ffffff"`. */
  color?: Paint;
  /** How far the glow reaches out from the glyph, in px, before the blur. Default: `8`. */
  stroke?: number;
  /** Default: `8`. */
  blur?: number;
}

/** A soft halo around the glyph: the glyph grown by `stroke` and blurred. Put it below the fill. */
export function glow({ color = "#ffffff", stroke = 8, ...options }: GlowOptions = {}): Layer {
  return { blur: 8, ...options, paint: color, stroke };
}

export interface InnerShadowOptions extends Omit<LayerOptions, "offset" | "shading"> {
  /** Default: `"rgba(0,0,0,0.6)"`. */
  color?: Paint;
  /** `[x, y]` offset of the shadow inside the shape (the layer itself stays in place). Default: `[4, 4]`. */
  offset?: readonly [number, number];
  /** Width of the fade in px. `0` is a hard edge. Default: `4`. */
  size?: number;
  /** Shade the glyph grown by this many px, e.g. an outline. Default: `0`. */
  stroke?: number;
}

/**
 * A shadow cast inside the glyph, as if it were cut out: darkens the edge the shadow is offset away from. Put it above
 * the fill it shades.
 */
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
  /** Default: `"#ffffff"`. */
  color?: Paint;
  /** Width of the fade in px. Default: `8`. */
  size?: number;
  /** Light the glyph grown by this many px, e.g. an outline. Default: `0`. */
  stroke?: number;
}

/** Light along the whole inner edge of the glyph, fading toward its inside. Put it above the fill it lights. */
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

/**
 * An embossed edge, as two layers: the highlight side, then the shadow side. Spread them above the fill they light.
 *
 * @example layers: [stroke(8, "#000"), fill("#f5c542"), ...bevel({ size: 6 })]
 */
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
  /** Default: `"rgba(0,0,0,0.5)"`. */
  color?: Paint;
  /** Shade the glyph grown by this many px, e.g. an outline. Default: `0`. */
  stroke?: number;
}

/** Silky bands of `color` inside the glyph, like Photoshop's satin. Put it above the fill it shades. */
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

/**
 * A linear gradient. Plain colors are spread evenly from `0` to `1`; use `[offset, color]` stops to place them.
 * `angle` is a CSS angle in degrees (default `180`, top → bottom), `reflect: true` runs the stops from the middle out
 * to both ends, and `scope` defaults to `"line"`.
 *
 * @example linearGradient(["#ffffff", "#ffd400"], { angle: 180, scope: "glyph" })
 */
export function linearGradient(
  stops: readonly GradientStopInput[] | readonly ColorValue[],
  options: { angle?: number; reflect?: boolean; scope?: PaintScope } = {},
): LinearGradient {
  return { type: "linear", ...options, stops: normalizeStopInput(stops) };
}

/**
 * A radial gradient. Plain colors are spread evenly from the center (`0`) outward (`1`). `center` is a fraction of the
 * scope box (default `[0.5, 0.5]`), `radius` a factor of the distance to its farthest corner (default `1`), and
 * `scope` defaults to `"line"`.
 */
export function radialGradient(
  stops: readonly GradientStopInput[] | readonly ColorValue[],
  options: { center?: readonly [number, number]; radius?: number; scope?: PaintScope } = {},
): RadialGradient {
  return { type: "radial", ...options, stops: normalizeStopInput(stops) };
}

/**
 * A conic (angle) gradient. Plain colors are spread evenly clockwise from `angle` (`0`) around to the start again
 * (`1`). `angle` is in degrees clockwise from the top (default `0`), `center` a fraction of the scope box (default
 * `[0.5, 0.5]`), and `scope` defaults to `"line"`. Repeat the first color at the end for a seamless loop.
 */
export function conicGradient(
  stops: readonly GradientStopInput[] | readonly ColorValue[],
  options: { angle?: number; center?: readonly [number, number]; scope?: PaintScope } = {},
): ConicGradient {
  return { type: "conic", ...options, stops: normalizeStopInput(stops) };
}

/**
 * A diamond gradient. Plain colors are spread evenly from the center (`0`) out to the diamond through the scope box's
 * farthest corner (`1`). `radius` scales the diamond (default `1`), `angle` turns it clockwise in degrees (default
 * `0`), `center` is a fraction of the scope box (default `[0.5, 0.5]`), and `scope` defaults to `"line"`.
 */
export function diamondGradient(
  stops: readonly GradientStopInput[] | readonly ColorValue[],
  options: { center?: readonly [number, number]; radius?: number; angle?: number; scope?: PaintScope } = {},
): DiamondGradient {
  return { type: "diamond", ...options, stops: normalizeStopInput(stops) };
}

/** Plain colors are spread evenly from 0 to 1. */
function normalizeStopInput(stops: readonly GradientStopInput[] | readonly ColorValue[]): readonly GradientStopInput[] {
  return stops.map((stop, index) =>
    typeof stop === "string" || typeof stop === "number"
      ? ([stops.length === 1 ? 0 : index / (stops.length - 1), stop] as const)
      : stop,
  );
}
