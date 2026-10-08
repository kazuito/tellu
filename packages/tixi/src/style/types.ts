import type { BLEND_MODES, Filter } from "pixi.js";

export type ColorValue = string | number;

export interface GradientStop {
  offset: number;
  color: ColorValue;
}

export type GradientStopInput = GradientStop | readonly [offset: number, color: ColorValue];

/**
 * The box a gradient or pattern is stretched over.
 * - `glyph`: each character's em box
 * - `line`: each line's content box
 * - `block`: the whole text block
 */
export type PaintScope = "glyph" | "line" | "block";

export interface LinearGradient {
  type: "linear";
  /** CSS `linear-gradient` angle in degrees (`180` = top → bottom). Default: `180`. */
  angle?: number;
  stops: readonly GradientStopInput[];
  /** Default: `"line"`. */
  scope?: PaintScope;
}

export interface RadialGradient {
  type: "radial";
  /** Center relative to the scope box (`[0.5, 0.5]` = middle). */
  center?: readonly [number, number];
  /** Radius as a factor of the distance to the farthest corner. Default: `1`. */
  radius?: number;
  stops: readonly GradientStopInput[];
  /** Default: `"line"`. */
  scope?: PaintScope;
}

export interface PatternPaint {
  type: "pattern";
  source: CanvasImageSource;
  repetition?: "repeat" | "repeat-x" | "repeat-y" | "no-repeat";
  scale?: number;
  offset?: readonly [number, number];
  /** Default: `"block"`. */
  scope?: PaintScope;
}

export type Paint = ColorValue | LinearGradient | RadialGradient | PatternPaint;

/**
 * - `outside`: grows the glyph outward by `stroke` (the interior is painted too)
 * - `inside`: a band of width `stroke` along the inner edge of the glyph
 * - `center`: a band of width `stroke` centered on the glyph outline
 */
export type StrokePosition = "outside" | "inside" | "center";

/**
 * One decoration layer. Every layer is the glyph shape grown by `stroke`
 * and painted with `paint`, so fills, outlines, shadows and glows are all layers.
 */
export interface Layer {
  /** Name used to target this layer from a run's layer patch. */
  id?: string;
  paint: Paint;
  /** Stroke width in px. `0` paints the glyph itself. Default: `0`. */
  stroke?: number;
  /** Default: `"outside"`. */
  strokePosition?: StrokePosition;
  /** Default: `"round"`. Non-uniform `scaleX`/`scaleY` always renders round joins. */
  join?: CanvasLineJoin;
  /** Default: `10`. */
  miterLimit?: number;
  offset?: readonly [x: number, y: number];
  /** Blur strength (PixiJS `BlurFilter` strength). */
  blur?: number;
  /** PixiJS `BlurFilter` quality. Default: `4`. */
  blurQuality?: number;
  /** Default: `1`. */
  opacity?: number;
  /** Blend mode against the layers below. Default: `"normal"`. */
  blendMode?: BLEND_MODES;
  /** Extra PixiJS filters applied to this layer. */
  filters?: readonly Filter[];
  /** Default: `true`. */
  visible?: boolean;
}

export type FontWeight = number | "normal" | "bold" | "bolder" | "lighter";
export type FontStyle = "normal" | "italic" | "oblique";

/** Length in px, or `{ em }` relative to the font size. */
export type Length = number | { em: number };

/** Multiplier of the font size, or `{ px }` for an absolute line height. */
export type LineHeight = number | { px: number };

export interface TelopStyle {
  fontFamily: string | readonly string[];
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  /** Extra space after each character. */
  letterSpacing: Length;
  /** Horizontal glyph scale (長体 < 1 < 平体). */
  scaleX: number;
  /** Vertical glyph scale. */
  scaleY: number;
  lineHeight: LineHeight;
  kerning: boolean;
  /** Moves glyphs up by this amount relative to the baseline. */
  baselineShift: Length;
  /** Bottom → top. */
  layers: readonly Layer[];
}

/** Patch layers of the base style by index or by `id`. */
export type LayerPatch = { readonly [indexOrId: string]: Partial<Layer> };

export type StyleOverride = Partial<Omit<TelopStyle, "layers">> & {
  /** An array replaces all layers; an object patches layers by index or `id`. */
  layers?: readonly Layer[] | LayerPatch;
};

export interface RunObject {
  text: string;
  style?: StyleOverride;
  /** Markup tags enclosing this run, outermost first. Exposed to `glyphTransform`. */
  tags?: readonly string[];
}

export type Run = string | RunObject;

export type TelopText = string | readonly Run[];

export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * - `visible`: let lines overflow `maxWidth`
 * - `shrink`: scale the font down until the text fits `maxWidth` (and `maxLines`)
 * - `squeeze`: compress overflowing lines horizontally (長体で収める)
 */
export type Overflow = "visible" | "shrink" | "squeeze";

/**
 * - `char`: break between any CJK characters
 * - `phrase`: keep Japanese phrases (文節) together, using `Intl.Segmenter`
 */
export type LineBreak = "char" | "phrase";

export interface KinsokuRules {
  /** Characters that must not start a line (行頭禁則). */
  lineStart: string;
  /** Characters that must not end a line (行末禁則). */
  lineEnd: string;
  /** Characters that must not be split when repeated (分離禁止, e.g. `……`). */
  inseparable: string;
  /** Characters allowed to hang past `maxWidth` instead of being pushed to the next line (ぶら下げ). */
  hanging: string;
}

export interface PlateStyle {
  paint: Paint;
  /** `[x, y]` padding around the text. Default: `[24, 12]`. */
  padding?: number | readonly [x: number, y: number];
  radius?: number;
  stroke?: { width: number; paint: Paint };
  /** One plate around the whole block, or one per line. Default: `"block"`. */
  mode?: "block" | "line";
  offset?: readonly [x: number, y: number];
  blur?: number;
  opacity?: number;
  filters?: readonly Filter[];
}

export interface GlyphContext {
  /** Index among all characters, including whitespace. */
  index: number;
  /** Number of characters, including whitespace. */
  count: number;
  /** Index among visible (non-whitespace) characters, or `-1` for whitespace. */
  visibleIndex: number;
  visibleCount: number;
  lineIndex: number;
  lineCount: number;
  indexInLine: number;
  lineLength: number;
  text: string;
  runIndex: number;
  tags: readonly string[];
  isWhitespace: boolean;
  /** Glyph box in layout coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GlyphTransform {
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  /** Degrees. */
  rotation?: number;
  /** Degrees. */
  skewX?: number;
  /** Degrees. */
  skewY?: number;
  opacity?: number;
  visible?: boolean;
  /** Transform origin relative to the glyph box. Default: `[0.5, 0.5]`. */
  origin?: readonly [number, number];
}

export type GlyphTransformFn = (glyph: GlyphContext) => GlyphTransform | void | undefined;

export interface TelopLayoutOptions {
  text: TelopText;
  style?: Partial<TelopStyle>;
  /** Width of the layout box. Enables wrapping unless `wrap` is `"none"`. */
  maxWidth?: number;
  /** Default: `"auto"` when `maxWidth` is set. */
  wrap?: "auto" | "none";
  /** Default: `"left"`. */
  align?: TextAlign;
  /** Default: `"visible"`. */
  overflow?: Overflow;
  /** Smallest scale `shrink` / `squeeze` may apply. Default: `0.3`. */
  minScale?: number;
  maxLines?: number;
  /** Default: `true`. */
  kinsoku?: boolean | Partial<KinsokuRules>;
  /** Default: `"char"`. */
  lineBreak?: LineBreak;
  /** Locale for segmentation. Default: `"ja"`. */
  locale?: string;
}

export interface TelopProps extends TelopLayoutOptions {
  background?: PlateStyle;
  glyphTransform?: GlyphTransformFn;
}
