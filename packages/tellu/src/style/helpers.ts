import type {
  BevelShading,
  BoxDecoration,
  ColorValue,
  ConicGradient,
  Contour,
  DiamondGradient,
  GradientStopInput,
  Layer,
  LayerPaint,
  LayerRepeat,
  Length,
  LinearGradient,
  LineDecoration,
  Paint,
  PaintScope,
  RadialGradient,
  SatinShading,
  Shading,
  ShapeGradient,
  TextPath,
  TextPathArc,
} from "./types";

type LayerOptions = Omit<Layer, "paint" | "stroke">;

/** `shading` with `contour`, if there is one. Shading helpers put their `contour` here, not on the layer. */
function withContour<T extends Shading>(shading: T, contour: Contour | undefined): T {
  return contour === undefined ? shading : { ...shading, contour };
}

/**
 * A layer that paints the glyph itself. Emoji and other color glyphs keep their own colors (`colorGlyphs: "keep"`);
 * pass `colorGlyphs: "paint"` to paint them too.
 *
 * @example fill(linearGradient(["#fff6c0", "#f5b400"]))
 */
export function fill(paint: LayerPaint, options?: LayerOptions): Layer {
  return { colorGlyphs: "keep", ...options, paint, stroke: 0 };
}

/**
 * An outline: the glyph grown by `width` (px, or `{ em }` relative to the font size). Put it below the fill; `options.strokePosition` makes inside or centered
 * strokes.
 *
 * @example layers: [stroke(16, "#000"), stroke(8, "#e60033"), fill("#fff")]
 */
export function stroke(width: Length, paint: LayerPaint, options?: LayerOptions): Layer {
  return { ...options, paint, stroke: width };
}

export interface ShadowOptions extends Omit<LayerOptions, "offset"> {
  /** Default: `"rgba(0,0,0,0.6)"`. */
  color?: LayerPaint;
  /** `[x, y]` offset. Default: `[4, 4]` (px). */
  offset?: readonly [Length, Length];
  /** Grow the shadow shape, e.g. to cast the shadow of an outline. Default: `0`. */
  stroke?: Length;
  /** Default: `4` (px). */
  blur?: Length;
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
  color?: LayerPaint;
  /** How far the glow reaches out from the glyph before the blur. Default: `8` (px). */
  stroke?: Length;
  /** Default: `8` (px). */
  blur?: Length;
}

/** A soft halo around the glyph: the glyph grown by `stroke` and blurred. Put it below the fill. */
export function glow({ color = "#ffffff", stroke = 8, ...options }: GlowOptions = {}): Layer {
  return { blur: 8, ...options, paint: color, stroke };
}

export interface ExtrudeOptions extends Omit<LayerOptions, "repeat"> {
  /** Paint of the extrusion. Default: `"#000000"`. */
  color?: LayerPaint;
  /** How deep the extrusion goes, in px. Default: `12`. */
  depth?: number;
  /** Direction it goes, in degrees clockwise from the top: `180` is straight down, `135` down and to the right. Default: `135`. */
  angle?: number;
  /** Extrude the glyph grown by this much, e.g. the width of the widest outline. Default: `0`. */
  stroke?: Length;
  /** Tint of the back of the extrusion, multiplied into its paint, to shade it toward the back. Default: none. */
  shade?: ColorValue;
}

/** Rounds away the floating-point noise of sines and cosines (`6e-17` for `0`), and `-0`. */
const tidy = (value: number) => Math.round(value * 1e9) / 1e9 || 0;

/**
 * Extruded text (立体文字): copies of the glyph stacked `depth` px deep toward `angle`, a pixel apart, so they read as
 * one solid block. Put it first, below the outlines, with the width of the widest outline as `stroke`.
 *
 * @example layers: [extrude({ depth: 10, stroke: 12, color: "#7a0019" }), stroke(12, "#c8102e"), fill("#fff")]
 */
export function extrude({
  color = "#000000",
  depth = 12,
  angle = 135,
  stroke = 0,
  shade,
  ...options
}: ExtrudeOptions = {}): Layer {
  const radians = (angle * Math.PI) / 180;
  const count = Math.max(1, Math.round(depth));
  const step = depth / count;
  const repeat: LayerRepeat = { count, offset: [tidy(Math.sin(radians) * step), tidy(-Math.cos(radians) * step)] };
  if (shade !== undefined) repeat.tint = shade;
  return { ...options, paint: color, stroke, repeat };
}

export interface EchoOptions extends Omit<LayerOptions, "repeat" | "offset"> {
  /** Default: `"#ffffff"`. */
  color?: LayerPaint;
  /** Number of echoes. Default: `3`. */
  count?: number;
  /** `[x, y]` shift of each echo from the one in front of it. Default: `[6, 6]` (px). */
  offset?: readonly [Length, Length];
  /** Opacity of the farthest echo, relative to the nearest; the ones in between fade to it. Default: `0.25`. */
  fade?: number;
  /** Echo the glyph grown by this much, e.g. an outline. Default: `0`. */
  stroke?: Length;
}

/**
 * Echoes: fading copies of the glyph trailing behind it, each `offset` from the one in front. Put it first, below the
 * other layers. Its `opacity` (default `0.6`) applies to all the echoes.
 */
export function echo({
  color = "#ffffff",
  count = 3,
  offset = [6, 6],
  fade = 0.25,
  stroke = 0,
  ...options
}: EchoOptions = {}): Layer {
  const layer: Layer = { opacity: 0.6, ...options, paint: color, stroke, offset };
  if (count > 1) layer.repeat = { count: count - 1, offset, opacity: fade };
  return layer;
}

export interface InnerShadowOptions extends Omit<LayerOptions, "offset" | "shading"> {
  /** Default: `"rgba(0,0,0,0.6)"`. */
  color?: LayerPaint;
  /** `[x, y]` offset of the shadow inside the shape (the layer itself stays in place). Default: `[4, 4]` (px). */
  offset?: readonly [Length, Length];
  /** Width of the fade. `0` is a hard edge. Default: `4` (px). */
  size?: Length;
  /** Shade the glyph grown by this much, e.g. an outline. Default: `0`. */
  stroke?: Length;
  /** Remaps the strength of the shading through a curve (see `Shading.contour`). Default: none. */
  contour?: Contour;
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
  contour,
  ...options
}: InnerShadowOptions = {}): Layer {
  return { ...options, paint: color, stroke, shading: withContour({ type: "inset", offset, size }, contour) };
}

export interface InnerGlowOptions extends Omit<LayerOptions, "shading"> {
  /** Default: `"#ffffff"`. */
  color?: LayerPaint;
  /** Width of the fade. Default: `8` (px). */
  size?: Length;
  /** Light the glyph grown by this much, e.g. an outline. Default: `0`. */
  stroke?: Length;
  /** Remaps the strength of the shading through a curve (see `Shading.contour`). Default: none. */
  contour?: Contour;
}

/** Light along the whole inner edge of the glyph, fading toward its inside. Put it above the fill it lights. */
export function innerGlow({
  color = "#ffffff",
  size = 8,
  stroke = 0,
  contour,
  ...options
}: InnerGlowOptions = {}): Layer {
  return { ...options, paint: color, stroke, shading: withContour({ type: "inset", size }, contour) };
}

export interface BevelOptions extends Omit<LayerOptions, "shading">, Omit<BevelShading, "type" | "side"> {
  /** Paint of the faces turned toward the light. Default: `"rgba(255,255,255,0.8)"`. */
  highlight?: LayerPaint;
  /** Paint of the faces turned away from the light. Default: `"rgba(0,0,0,0.5)"`. */
  shadow?: LayerPaint;
  /** Bevel the glyph grown by this much, e.g. an outline. Default: `0`. */
  stroke?: Length;
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
  contour,
  ...options
}: BevelOptions = {}): [highlight: Layer, shadow: Layer] {
  const shading = withContour({ type: "bevel", size, angle, depth, technique } as const, contour);
  return [
    { ...options, paint: highlight, stroke, shading: { ...shading, side: "highlight" } },
    { ...options, paint: shadow, stroke, shading: { ...shading, side: "shadow" } },
  ];
}

export interface SatinOptions extends Omit<LayerOptions, "offset" | "shading">, Omit<SatinShading, "type"> {
  /** Default: `"rgba(0,0,0,0.5)"`. */
  color?: LayerPaint;
  /** Shade the glyph grown by this much, e.g. an outline. Default: `0`. */
  stroke?: Length;
}

/** Silky bands of `color` inside the glyph, like Photoshop's satin. Put it above the fill it shades. */
export function satin({
  color = "rgba(0,0,0,0.5)",
  offset = [4, 4],
  size = 8,
  invert = false,
  stroke = 0,
  contour,
  ...options
}: SatinOptions = {}): Layer {
  return { ...options, paint: color, stroke, shading: withContour({ type: "satin", offset, size, invert }, contour) };
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

/**
 * A gradient that follows the layer's shape (shape burst): plain colors are spread evenly from the glyph's edge (`0`)
 * to the far edge of the layer (`1`). On an outline, hard stops make several bands in one layer. On a fill, the stops
 * end `size` px inside the glyph (default `8`). `reverse` runs them from the far edge back. Only layers take it.
 *
 * @example stroke(16, shapeGradient([[0, "#fff"], [0.5, "#fff"], [0.5, "#000"], [1, "#000"]]))
 */
export function shapeGradient(
  stops: readonly GradientStopInput[] | readonly ColorValue[],
  options: { size?: Length; reverse?: boolean } = {},
): ShapeGradient {
  return { type: "shape", ...options, stops: normalizeStopInput(stops) };
}

/** Plain colors are spread evenly from 0 to 1. */
function normalizeStopInput(stops: readonly GradientStopInput[] | readonly ColorValue[]): readonly GradientStopInput[] {
  return stops.map((stop, index) =>
    typeof stop === "string" || typeof stop === "number"
      ? ([stops.length === 1 ? 0 : index / (stops.length - 1), stop] as const)
      : stop,
  );
}

/** Options of `marker()` and `frame()`: every `BoxDecoration` option except `type`. */
export type BoxDecorationOptions = Omit<BoxDecoration, "type">;

/**
 * A marker (蛍光ペン) behind a run: a box painted with `paint` over the lower half of the em box (`inset: [0.5, 1]`),
 * reaching 2px past the run on both ends. `inset: [0, 1]` covers the whole em box, like a plate behind just this run.
 *
 * @example parseMarkup("ここが<em>大事</em>", { em: { decorations: [marker("#ffe600")] } })
 */
export function marker(paint: Paint, options: Omit<BoxDecorationOptions, "paint"> = {}): BoxDecoration {
  return { type: "box", paint, inset: [0.5, 1], padding: [2, 0], ...options };
}

/**
 * A frame (囲み) around a run: a box with a `width` px border painted with `paint` (default `3`) and no fill, `[4, 2]`
 * px away from the em box along and across the line.
 *
 * @example { decorations: [frame("#e60033", { radius: 6 })] }
 */
export function frame(
  paint: Paint,
  options: Omit<BoxDecorationOptions, "stroke"> & { width?: Length } = {},
): BoxDecoration {
  const { width = 3, ...rest } = options;
  return { type: "box", stroke: { width, paint }, padding: [4, 2], ...rest };
}

/** Options of `underline()`, `overline()` and `lineThrough()`: every `LineDecoration` option except `type`. */
export type LineDecorationOptions = Omit<LineDecoration, "type">;

/**
 * An underline, painted with the run's layers, so its outline merges with the glyphs'. In vertical text it goes on the
 * right (傍線) unless `position` says otherwise.
 *
 * @example parseMarkup("<u>要チェック</u>", { u: { decorations: [underline({ style: "wavy" })] } })
 */
export function underline(options: LineDecorationOptions = {}): LineDecoration {
  return { type: "line", position: "auto", ...options };
}

/** A line over the text (on the right in vertical text), painted with the run's layers. */
export function overline(options: Omit<LineDecorationOptions, "position"> = {}): LineDecoration {
  return { type: "line", position: "over", ...options };
}

/**
 * A line through the middle of the em box (打ち消し線), painted with the run's layers.
 *
 * @example { decorations: [lineThrough({ thickness: { em: 0.08 } })] }
 */
export function lineThrough(options: Omit<LineDecorationOptions, "position"> = {}): LineDecoration {
  return { type: "line", position: "through", ...options };
}

/**
 * A circular text path of `radius` px (`textPath`). By default the text runs clockwise over the top of a full circle,
 * centered at the top with `align: "center"`. For text along the bottom that reads left to right, use
 * `{ center: 180, direction: "counterclockwise" }`.
 *
 * @example { text: "まもなく開店", textPath: arcPath(300, { sweep: 120 }), align: "center" }
 */
export function arcPath(
  radius: number,
  options: Omit<TextPathArc, "radius"> & Pick<TextPath, "startOffset" | "side"> = {},
): TextPath {
  const { startOffset, side, ...arc } = options;
  const path: TextPath = { arc: { radius, ...arc } };
  if (startOffset !== undefined) path.startOffset = startOffset;
  if (side !== undefined) path.side = side;
  return path;
}
