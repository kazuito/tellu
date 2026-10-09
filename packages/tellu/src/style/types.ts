import type { BLEND_MODES, Filter } from "pixi.js";

export type ColorValue = string | number;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  /** Blur strength in px (PixiJS `BlurFilter` strength). The drawn area grows to fit the whole blur. */
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

/** CSS `writing-mode`. `vertical-rl` stacks lines right → left (縦書き), `vertical-lr` left → right. */
export type WritingMode = "horizontal-tb" | "vertical-rl" | "vertical-lr";

export type TextOrientation = "mixed" | "upright" | "sideways";

export type TextCombineUpright = "none" | "all" | "digits" | "digits 2" | "digits 3" | "digits 4";

export interface TextStyle {
  fontFamily: string | readonly string[];
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  /** Extra space after each character. */
  letterSpacing: Length;
  /**
   * 文字ツメ: removes this fraction (`0`–`1`) of the blank space on both sides of each Japanese or Chinese
   * character (kana, kanji and fullwidth punctuation), measured from its ink. Needs `Measurer.inkBounds`.
   */
  tsume: number;
  /** Horizontal glyph scale (長体 < 1 < 平体). */
  scaleX: number;
  /** Vertical glyph scale. */
  scaleY: number;
  lineHeight: LineHeight;
  kerning: boolean;
  /** Moves glyphs up (right in vertical text) by this amount relative to the baseline. */
  baselineShift: Length;
  /**
   * Glyph orientation in vertical text (CSS `text-orientation`).
   * - `mixed`: CJK upright, latin and digits rotated
   * - `upright`: every glyph upright
   * - `sideways`: every glyph rotated, like horizontal text turned 90° clockwise
   */
  textOrientation: TextOrientation;
  /**
   * 縦中横 in vertical text (CSS `text-combine-upright`): set horizontally inside one upright cell,
   * condensed to fit 1em.
   * - `all`: each run of this style
   * - `digits` / `digits N`: runs of at most N (default 2) ASCII digits
   */
  textCombineUpright: TextCombineUpright;
  /** Bottom → top. */
  layers: readonly Layer[];
}

/** Patch layers of the base style by index or by `id`. */
export type LayerPatch = { readonly [indexOrId: string]: Partial<Layer> };

export type StyleOverride = Partial<Omit<TextStyle, "layers">> & {
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

export type TextContent = string | readonly Run[];

/**
 * Position of each line along the line direction. `start` / `end` follow the writing mode;
 * `left` / `top` mean `start` and `right` / `bottom` mean `end` in either direction.
 */
export type TextAlign = "start" | "center" | "end" | "justify" | "left" | "right" | "top" | "bottom";

/**
 * - `visible`: let lines overflow the line length
 * - `shrink`: scale the font down until the text fits `maxWidth`, `maxHeight` and `maxLines`
 * - `squeeze`: compress overflowing lines along the line (長体で収める)
 */
export type Overflow = "visible" | "shrink" | "squeeze";

/**
 * - `char`: break between any CJK characters
 * - `phrase`: keep Japanese phrases (文節) together, using `Intl.Segmenter`
 */
export type LineBreak = "char" | "phrase";

/**
 * Trims the blank half of fullwidth punctuation at the edges of lines (約物の半角取り).
 * - `start`: opening brackets at the start of a line
 * - `end`: closing brackets, 、 and 。 at the end of a line. One that only fits trimmed stays on the line.
 * - `both`: both
 */
export type PunctuationTrim = "none" | "start" | "end" | "both";

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
  /** `[x, y]` padding around the text. Default: 24 along the lines and 12 across them (`[24, 12]` in horizontal text). */
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
  /** Glyph cell in layout coordinates: its advance along the line × the font's extent across it. */
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

export interface LayoutOptions {
  text: TextContent;
  style?: Partial<TextStyle>;
  /** Default: `"horizontal-tb"`. */
  writingMode?: WritingMode;
  /**
   * Width of the layout box. In horizontal text it is the line length and enables wrapping;
   * in vertical text it only bounds `overflow: "shrink"`.
   */
  maxWidth?: number;
  /**
   * Height of the layout box. In vertical text it is the line length and enables wrapping;
   * in horizontal text it only bounds `overflow: "shrink"`.
   */
  maxHeight?: number;
  /** Default: `"auto"` when the line length (`maxWidth`, or `maxHeight` in vertical text) is set. */
  wrap?: "auto" | "none";
  /** Default: `"start"`. */
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
  /** Default: `"none"`. */
  punctuationTrim?: PunctuationTrim;
  /**
   * Space between kana or kanji and Latin letters or digits (和欧間アキ). `true` is a quarter em of the
   * smaller font. Default: `false`.
   */
  autospace?: boolean | Length;
  /** Locale for segmentation. Default: `"ja"`. */
  locale?: string;
}

export interface TextNodeProps extends LayoutOptions {
  background?: PlateStyle;
  glyphTransform?: GlyphTransformFn;
}
