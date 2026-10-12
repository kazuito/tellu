import type { BLEND_MODES, Filter } from "pixi.js";

/** Any CSS color string, or a number as `0xRRGGBB`. Numbers have no alpha: use a string such as `rgba()` for that. */
export type ColorValue = string | number;

/** A rectangle in layout coordinates: px from the top-left of the layout box. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GradientStop {
  /** Position along the gradient, from `0` to `1`. */
  offset: number;
  color: ColorValue;
}

/** A gradient stop as an object, or as an `[offset, color]` tuple. */
export type GradientStopInput = GradientStop | readonly [offset: number, color: ColorValue];

/**
 * The box a gradient or pattern is stretched over.
 * - `glyph`: each character's em box
 * - `line`: each line's content box
 * - `block`: the whole text block
 */
export type PaintScope = "glyph" | "line" | "block";

/** A linear gradient, as in CSS. `linearGradient()` builds one from a list of colors. */
export interface LinearGradient {
  type: "linear";
  /** CSS `linear-gradient` angle in degrees (`180` = top → bottom, `90` = left → right). Default: `180`. */
  angle?: number;
  stops: readonly GradientStopInput[];
  /**
   * Reflected gradient: the stops run from the middle of the gradient line (`0`) out to both ends (`1`), as in
   * Photoshop's reflected gradient. Default: `false`.
   */
  reflect?: boolean;
  /** Default: `"line"`. */
  scope?: PaintScope;
}

/** A radial gradient. `radialGradient()` builds one from a list of colors. */
export interface RadialGradient {
  type: "radial";
  /** Center as fractions of the scope box (`[0.5, 0.5]` = middle). Default: `[0.5, 0.5]`. */
  center?: readonly [number, number];
  /** Radius as a factor of the distance from the center to the farthest corner. Default: `1`. */
  radius?: number;
  stops: readonly GradientStopInput[];
  /** Default: `"line"`. */
  scope?: PaintScope;
}

/** A conic (angle) gradient: the stops run clockwise around the center. `conicGradient()` builds one from a list of colors. */
export interface ConicGradient {
  type: "conic";
  /** Where the stops start, in degrees clockwise from the top, as in CSS `conic-gradient(from …)`. Default: `0`. */
  angle?: number;
  /** Center as fractions of the scope box. Default: `[0.5, 0.5]`. */
  center?: readonly [number, number];
  stops: readonly GradientStopInput[];
  /** Default: `"line"`. */
  scope?: PaintScope;
}

/**
 * A diamond gradient: the stops run from the center (`0`) out to a diamond (a square turned 45°) through the farthest
 * corner of the scope box (`1`), as in Photoshop. `diamondGradient()` builds one from a list of colors.
 */
export interface DiamondGradient {
  type: "diamond";
  /** Center as fractions of the scope box. Default: `[0.5, 0.5]`. */
  center?: readonly [number, number];
  /** Size of the diamond as a factor of the one through the farthest corner. Default: `1`. */
  radius?: number;
  /** Clockwise rotation of the diamond in degrees. Default: `0`. */
  angle?: number;
  stops: readonly GradientStopInput[];
  /** Default: `"line"`. */
  scope?: PaintScope;
}

/** An image repeated over the scope box, e.g. a texture inside the glyphs. */
export interface PatternPaint {
  type: "pattern";
  /**
   * A loaded image, canvas or bitmap. It is compared by identity, so reuse one instance: a new one on every render
   * re-rasterizes the text.
   */
  source: CanvasImageSource;
  /** Default: `"repeat"`. */
  repetition?: "repeat" | "repeat-x" | "repeat-y" | "no-repeat";
  /** Image scale. Default: `1`. */
  scale?: number;
  /** `[x, y]` shift of the image in px from the top-left of the scope box. Default: `[0, 0]`. */
  offset?: readonly [number, number];
  /** Default: `"block"`. */
  scope?: PaintScope;
}

/** What a layer or plate is filled with: a solid color, a gradient or an image pattern. */
export type Paint = ColorValue | LinearGradient | RadialGradient | ConicGradient | DiamondGradient | PatternPaint;

/**
 * - `outside`: grows the glyph outward by `stroke` (the interior is painted too)
 * - `inside`: a band of width `stroke` along the inner edge of the glyph
 * - `center`: a band of width `stroke` centered on the glyph outline
 */
export type StrokePosition = "outside" | "inside" | "center";

/**
 * Paints the edge of the layer's shape, fading toward its inside (inner shadow, inner glow).
 * The fade starts at the edge of the shape shifted by `offset`.
 */
export interface InsetShading {
  type: "inset";
  /** `[x, y]` shift of the edge the fade starts from. Default: `[0, 0]`. */
  offset?: readonly [x: number, y: number];
  /** Width of the fade in px. `0` is a hard edge. Default: `4`. */
  size?: number;
}

/**
 * Lights the layer's shape as if its edge were beveled, and paints its lit or its shaded side. Flat parts, farther than
 * `size` from the edge, are not painted.
 */
export interface BevelShading {
  type: "bevel";
  /** `highlight` paints the faces turned toward the light, `shadow` the faces turned away. Default: `"highlight"`. */
  side?: "highlight" | "shadow";
  /** Width of the bevel in px. Default: `4`. */
  size?: number;
  /** Direction the light comes from, in degrees clockwise from the top (`315` = top left). Default: `315`. */
  angle?: number;
  /** Steepness of the bevel; higher values make the lighting stronger. Default: `1`. */
  depth?: number;
  /**
   * - `smooth`: rounded, flattening toward the inside
   * - `chisel`: flat faces with a sharp ridge
   * Default: `"smooth"`.
   */
  technique?: "smooth" | "chisel";
}

/**
 * Silky bands inside the layer's shape (サテン): where two copies of the softened shape, shifted by `offset` and by
 * `-offset`, differ.
 */
export interface SatinShading {
  type: "satin";
  /** `[x, y]` shift of each copy. Default: `[4, 4]`. */
  offset?: readonly [x: number, y: number];
  /** Softness of the copies in px. Default: `8`. */
  size?: number;
  /** Paint where the copies agree instead. Default: `false`. */
  invert?: boolean;
}

/**
 * Varies how strongly a layer paints its shape, computed from the distance to the shape's edge. The shape is the
 * layer's own (the glyph grown by `stroke`), and lengths are in screen px, so they don't turn with sideways glyphs in
 * vertical text. Shading is computed per glyph: shaded outlines of overlapping neighbours show a seam.
 */
export type Shading = InsetShading | BevelShading | SatinShading;

/**
 * One decoration layer. Every layer is the glyph shape grown by `stroke` and painted with `paint`, so fills, outlines,
 * shadows and glows are all layers. Helpers such as `fill()`, `stroke()` and `shadow()` build common ones.
 *
 * Layers at the same index are drawn together for all glyphs, so every glyph's outline sits below every glyph's fill,
 * and overlapping glyphs merge instead of darkening where they meet.
 */
export interface Layer {
  /** Name a run's layer patch can target instead of the index, so the patch survives reordering the layers. */
  id?: string;
  paint: Paint;
  /**
   * How far the glyph shape grows in px, or the band width for `"inside"` and `"center"`. `0` paints the glyph itself.
   * Default: `0`.
   */
  stroke?: number;
  /** Default: `"outside"`. */
  strokePosition?: StrokePosition;
  /** Corner shape of the stroke. Default: `"round"`. Non-uniform `scaleX`/`scaleY` always renders round joins. */
  join?: CanvasLineJoin;
  /** Default: `10`. */
  miterLimit?: number;
  /** Paints the shape with a varying strength (inner shadow, inner glow, bevel, satin). Always renders round joins. */
  shading?: Shading;
  /** `[x, y]` shift of the layer in px, e.g. for a drop shadow. Default: `[0, 0]`. */
  offset?: readonly [x: number, y: number];
  /**
   * Blur strength in px (PixiJS `BlurFilter` strength), the same at any resolution. The drawn area grows to fit the
   * whole blur. Default: `0`.
   */
  blur?: number;
  /** PixiJS `BlurFilter` quality (number of passes). Default: `4`. */
  blurQuality?: number;
  /** Opacity of the whole layer, applied after its glyphs are merged. Default: `1`. */
  opacity?: number;
  /** Blend mode against the layers below. Default: `"normal"`. */
  blendMode?: BLEND_MODES;
  /**
   * Extra PixiJS filters applied to the whole layer. They are compared by identity, so create them once: new instances
   * on every render rebuild the text. tellu never destroys them.
   */
  filters?: readonly Filter[];
  /** `false` skips the layer, e.g. to turn it off for one run with a layer patch. Default: `true`. */
  visible?: boolean;
}

/** CSS `font-weight`: `1`–`1000` or a keyword. */
export type FontWeight = number | "normal" | "bold" | "bolder" | "lighter";
/** CSS `font-style`. */
export type FontStyle = "normal" | "italic" | "oblique";

/** Length in px, or `{ em }` relative to the font size. */
export type Length = number | { em: number };

/** Multiplier of the font size, or `{ px }` for an absolute line height. */
export type LineHeight = number | { px: number };

/** CSS `writing-mode`. `vertical-rl` stacks lines right → left (縦書き), `vertical-lr` left → right. */
export type WritingMode = "horizontal-tb" | "vertical-rl" | "vertical-lr";

/**
 * Glyph orientation in vertical text (CSS `text-orientation`).
 * - `mixed`: CJK upright, latin and digits rotated
 * - `upright`: every glyph upright
 * - `sideways`: every glyph rotated, like horizontal text turned 90° clockwise
 */
export type TextOrientation = "mixed" | "upright" | "sideways";

/**
 * 縦中横 in vertical text (CSS `text-combine-upright`): characters set horizontally inside one upright cell,
 * condensed to fit 1em.
 * - `none`: never
 * - `all`: each run of this style
 * - `digits` / `digits N`: runs of at most N (default 2) ASCII digits
 */
export type TextCombineUpright = "none" | "all" | "digits" | "digits 2" | "digits 3" | "digits 4";

/**
 * The look of a run of text. Props take a `Partial<TextStyle>`: unset fields come from `defaultStyle`, and runs
 * override fields with a `StyleOverride`.
 */
export interface TextStyle {
  /**
   * A CSS font family list (`"'Noto Sans JP', sans-serif"`) or an array of names. Web fonts must be declared with
   * `@font-face` before the text is drawn. Default: `"sans-serif"`.
   */
  fontFamily: string | readonly string[];
  /** Font size in px. Default: `64`. */
  fontSize: number;
  /** Default: `"normal"`. */
  fontWeight: FontWeight;
  /** Default: `"normal"`. */
  fontStyle: FontStyle;
  /** Extra space after each character, along the line. Default: `0`. */
  letterSpacing: Length;
  /**
   * 文字ツメ: removes this fraction (`0`–`1`) of the blank space on both sides of each Japanese or Chinese
   * character (kana, kanji and fullwidth punctuation, letters and digits), measured from its ink.
   * Needs `Measurer.inkBounds`. Default: `0`.
   */
  tsume: number;
  /** Horizontal glyph scale: below `1` condenses (長体), above `1` widens (平体). Default: `1`. */
  scaleX: number;
  /** Vertical glyph scale. Default: `1`. */
  scaleY: number;
  /** Thickness of each line box. Default: `1.2` (× the font size). */
  lineHeight: LineHeight;
  /** Apply the font's kerning. Default: `true`. */
  kerning: boolean;
  /** Moves glyphs up (right in vertical text) by this amount relative to the baseline. Default: `0`. */
  baselineShift: Length;
  /** Glyph orientation in vertical text. Default: `"mixed"`. */
  textOrientation: TextOrientation;
  /** 縦中横 in vertical text. Default: `"digits 2"` (numbers of up to two digits). */
  textCombineUpright: TextCombineUpright;
  /** Decoration layers, bottom → top. Default: `[{ paint: "#ffffff" }]` (a white fill). */
  layers: readonly Layer[];
  /**
   * Lines and boxes along the text: underlines, markers, frames. A run's override adds its decorations to the ones it
   * inherits, like CSS `text-decoration`. Default: `[]`.
   */
  decorations: readonly Decoration[];
}

/**
 * Changes to the base style's layers, keyed by index or by a layer's `id`. Each patch is merged into its layer; other
 * layers stay as they are. When both keys match a layer, the `id` patch wins.
 *
 * @example { layers: { fill: { paint: "red" }, 0: { stroke: 12 } } }
 */
export type LayerPatch = { readonly [indexOrId: string]: Partial<Layer> };

/** Changes a run makes to the base style. Unset fields keep the base style's values. */
export type StyleOverride = Partial<Omit<TextStyle, "layers">> & {
  /** An array replaces all layers; an object patches layers by index or `id`. */
  layers?: readonly Layer[] | LayerPatch;
};

/** A run of text with its own style. `parseMarkup()` builds these from tagged markup. */
export interface RunObject {
  text: string;
  /** Changes to the base style for this run. */
  style?: StyleOverride;
  /** Markup tags enclosing this run, outermost first. Exposed to `glyphTransform`. */
  tags?: readonly string[];
}

/** A run of text: a plain string uses the base style. */
export type Run = string | RunObject;

/** The text to lay out: a string, or runs of differently styled text. `\n` breaks lines. */
export type TextContent = string | readonly Run[];

/**
 * Position of each line along the line direction. `start` / `end` follow the writing mode;
 * `left` / `top` mean `start` and `right` / `bottom` mean `end` in either direction.
 * `justify` fills the line length except on the last line and lines ended by `\n`; `justify-all` fills it
 * on every line (均等配置), spreading to the longest line without a line length.
 */
export type TextAlign = "start" | "center" | "end" | "justify" | "justify-all" | "left" | "right" | "top" | "bottom";

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
 * Paragraphs are separated by `\n`. `balance` and `pretty` only move breaks; alignment still uses the full line length.
 * - `auto`: fill each line before breaking
 * - `none`: break only at `\n`
 * - `balance`: make the lines of each paragraph about equally long
 * - `pretty`: avoid a last line with a single word, phrase or character (泣き別れ)
 */
export type TextWrap = "auto" | "none" | "balance" | "pretty";

/**
 * Trims the blank half of fullwidth punctuation at the edges of lines (約物の半角取り).
 * - `none`: never
 * - `start`: opening brackets at the start of a line
 * - `end`: closing brackets, 、 and 。 at the end of a line. One that only fits trimmed stays on the line.
 * - `both`: both
 */
export type PunctuationTrim = "none" | "start" | "end" | "both";

/** Characters that constrain line breaks (禁則処理). Each field is a string of characters. */
export interface KinsokuRules {
  /** Characters that must not start a line (行頭禁則). */
  lineStart: string;
  /** Characters that must not end a line (行末禁則). */
  lineEnd: string;
  /** Characters that must not be split when repeated (分離禁止, e.g. `……`). */
  inseparable: string;
  /** Characters allowed to hang past the line length instead of being pushed to the next line (ぶら下げ). */
  hanging: string;
}

/** A plate behind the text, around the content of the whole block or of each line, plus `padding`. */
export interface PlateStyle {
  /** Gradients and patterns span the whole plate, or each line's plate in `mode: "line"`. */
  paint: Paint;
  /**
   * `[x, y]` padding around the text in px, or one value for both. Default: 24 along the lines and 12 across them
   * (`[24, 12]` in horizontal text, `[12, 24]` in vertical text).
   */
  padding?: number | readonly [x: number, y: number];
  /** Corner radius in px, clamped to half the plate's size. Default: `0`. */
  radius?: number;
  /**
   * Slants the plate into a parallelogram, in degrees: its edge on the over side (the top, or the right in vertical
   * text) moves toward the end of the lines. Default: `0`.
   */
  skew?: number;
  /** A border centered on the plate's edge. */
  stroke?: { width: number; paint: Paint };
  /** One plate around the whole block, or one per line. Default: `"block"`. */
  mode?: "block" | "line";
  /** `[x, y]` shift in px. Default: `[0, 0]`. */
  offset?: readonly [x: number, y: number];
  /** Blur strength in px, as for layers. Default: `0`. */
  blur?: number;
  /** Default: `1`. */
  opacity?: number;
  /** Extra PixiJS filters, compared by identity like `Layer.filters`. */
  filters?: readonly Filter[];
}

/**
 * What `glyphTransform` knows about one glyph. A glyph is one grapheme cluster, or a whole 縦中横 group in vertical
 * text. Counts include whitespace unless noted.
 */
export interface GlyphContext {
  /** Index among all glyphs, including whitespace. */
  index: number;
  /** Number of glyphs, including whitespace. */
  count: number;
  /** Index among visible (non-whitespace) glyphs, or `-1` for whitespace. Use it to stagger animations. */
  visibleIndex: number;
  /** Number of visible (non-whitespace) glyphs. */
  visibleCount: number;
  lineIndex: number;
  lineCount: number;
  /** Index within its line. */
  indexInLine: number;
  /** Number of glyphs in its line. */
  lineLength: number;
  text: string;
  /** Index of its run in `text`. */
  runIndex: number;
  /** Markup tags enclosing its run, outermost first. */
  tags: readonly string[];
  isWhitespace: boolean;
  /** Left of the glyph's cell in layout coordinates: its advance along the line × the font's extent across it. */
  x: number;
  /** Top of the glyph's cell in layout coordinates. */
  y: number;
  /** Width of the glyph's cell. */
  width: number;
  /** Height of the glyph's cell. */
  height: number;
}

/**
 * How to draw one glyph relative to its place in the layout. It is visual only: line breaks and other glyphs don't
 * move. Unset fields leave the glyph as it is.
 */
export interface GlyphTransform {
  /** Shift in px. Default: `0`. */
  x?: number;
  /** Shift in px. Default: `0`. */
  y?: number;
  /** Uniform scale, multiplied with `scaleX` and `scaleY`. Default: `1`. */
  scale?: number;
  /** Default: `1`. */
  scaleX?: number;
  /** Default: `1`. */
  scaleY?: number;
  /** Clockwise rotation in degrees. Default: `0`. */
  rotation?: number;
  /** Degrees. Default: `0`. */
  skewX?: number;
  /** Degrees. Default: `0`. */
  skewY?: number;
  /** `0`–`1`. Default: `1`. */
  opacity?: number;
  /** Default: `true`. */
  visible?: boolean;
  /** Transform origin as fractions of the glyph's cell. Default: `[0.5, 0.5]` (its center). */
  origin?: readonly [number, number];
}

/**
 * Called for every glyph, whitespace included, each time the props are set. Return nothing to leave a glyph as it is.
 *
 * @example (glyph) => ({ y: Math.sin(frame / 5 + glyph.index) * 8 })
 */
export type GlyphTransformFn = (glyph: GlyphContext) => GlyphTransform | void | undefined;

/** How text is broken into lines, aligned and fitted. Everything but `text` is optional. */
export interface LayoutOptions {
  text: TextContent;
  /** Base style of every run. Unset fields come from `defaultStyle`. */
  style?: Partial<TextStyle>;
  /** Default: `"horizontal-tb"`. */
  writingMode?: WritingMode;
  /**
   * Width of the layout box in px. In horizontal text it is the line length and enables wrapping;
   * in vertical text it only bounds `overflow: "shrink"`.
   */
  maxWidth?: number;
  /**
   * Height of the layout box in px. In vertical text it is the line length and enables wrapping;
   * in horizontal text it only bounds `overflow: "shrink"`.
   */
  maxHeight?: number;
  /** How lines wrap at the line length. Without a line length, every mode breaks only at `\n`. Default: `"auto"`. */
  wrap?: TextWrap;
  /** Position of each line along the line direction. Default: `"start"`. */
  align?: TextAlign;
  /** What to do when text doesn't fit. Default: `"visible"`. */
  overflow?: Overflow;
  /** Smallest scale `shrink` applies to the font and `squeeze` to a line. Default: `0.3`. */
  minScale?: number;
  /** Drops the lines after this many. With `overflow: "shrink"`, the font shrinks to fit them first. */
  maxLines?: number;
  /**
   * Line breaking rules (禁則処理). `false` turns them off; an object replaces character sets of `defaultKinsoku`.
   * Default: `true`.
   */
  kinsoku?: boolean | Partial<KinsokuRules>;
  /** Where CJK text may break. Default: `"char"`. */
  lineBreak?: LineBreak;
  /** Trims the blank half of fullwidth punctuation at line edges (約物の半角取り). Default: `"none"`. */
  punctuationTrim?: PunctuationTrim;
  /**
   * Space between kana or kanji and Latin letters or digits (和欧間アキ). `true` is a quarter em of the
   * smaller font. Default: `false`.
   */
  autospace?: boolean | Length;
  /** Locale for `Intl.Segmenter` (graphemes, words and phrases). Default: `"ja"`. */
  locale?: string;
}

/** Everything that describes a caption: its text and layout, a background plate and per-glyph transforms. */
export interface TextNodeProps extends LayoutOptions {
  /** A plate drawn behind the text. */
  background?: PlateStyle;
  /**
   * Moves, scales, rotates or fades each glyph, e.g. to animate characters one by one. A new function alone doesn't
   * rebuild the text, so passing a fresh one every frame is cheap.
   */
  glyphTransform?: GlyphTransformFn;
}

/**
 * A box along a run of text, behind or in front of its glyphs: a marker (蛍光ペン), a highlight or a frame. One box is
 * drawn per line the run spans. `marker()` and `box()` build common ones.
 */
export interface BoxDecoration {
  type: "box";
  /** Fill of the box. Gradients and patterns span each box. Default: none. */
  paint?: Paint;
  /** A border centered on the box's edge. */
  stroke?: { width: number; paint: Paint };
  /**
   * The part of the em box the box covers across the line, as fractions from its over side (`0`, the top, or the right
   * in vertical text) to its under side (`1`). `[0.5, 1]` covers the lower half. Default: `[0, 1]`.
   */
  inset?: readonly [from: number, to: number];
  /** `[along, across]` the line in px, or one value for both, added around the box. Default: `0`. */
  padding?: number | readonly [along: number, across: number];
  /** Corner radius in px, clamped to half the box's size. Default: `0`. */
  radius?: number;
  /** Slants the box into a parallelogram, in degrees, like `PlateStyle.skew`. Default: `0`. */
  skew?: number;
  /** Behind the glyphs (above the plate), or in front of them. Default: `"behind"`. */
  placement?: "behind" | "front";
  /** `[x, y]` shift in px. Default: `[0, 0]`. */
  offset?: readonly [x: number, y: number];
  /** Blur strength in px, as for layers. Default: `0`. */
  blur?: number;
  /** Default: `1`. */
  opacity?: number;
  /** Default: `"normal"`. */
  blendMode?: BLEND_MODES;
  /** Extra PixiJS filters, compared by identity like `Layer.filters`. */
  filters?: readonly Filter[];
}

/** Something drawn along runs of text. */
export type Decoration = BoxDecoration;
