import type { Filter } from "pixi.js";

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
 * A gradient that follows the shape of the layer instead of running across a box (Photoshop's shape burst): `0` is the
 * glyph's edge and `1` the far edge of the layer, so the stops band an outline from the inside out. `shapeGradient()`
 * builds one from a list of colors. Only layers take it.
 */
export interface ShapeGradient {
  type: "shape";
  stops: readonly GradientStopInput[];
  /** For layers with no `stroke`: how far inside the glyph the stops end (`1`). Default: `8` (px). */
  size?: Length;
  /** Runs the stops from the far edge (`0`) back to the glyph's edge (`1`). Default: `false`. */
  reverse?: boolean;
}

/** What a layer is painted with: any `Paint`, or a `ShapeGradient`. */
export type LayerPaint = Paint | ShapeGradient;

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
  offset?: readonly [x: Length, y: Length];
  /** Width of the fade. `0` is a hard edge. Default: `4` (px). */
  size?: Length;
  /** Remaps the strength of the shading through a curve, like the contour of Photoshop's layer styles. Default: none. */
  contour?: Contour;
}

/**
 * Lights the layer's shape as if its edge were beveled, and paints its lit or its shaded side. Flat parts, farther than
 * `size` from the edge, are not painted.
 */
export interface BevelShading {
  type: "bevel";
  /** `highlight` paints the faces turned toward the light, `shadow` the faces turned away. Default: `"highlight"`. */
  side?: "highlight" | "shadow";
  /** Width of the bevel. Default: `4` (px). */
  size?: Length;
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
  /** Remaps the strength of the lighting through a curve, like Photoshop's gloss contour. Default: none. */
  contour?: Contour;
}

/**
 * Silky bands inside the layer's shape (サテン): where two copies of the softened shape, shifted by `offset` and by
 * `-offset`, differ.
 */
export interface SatinShading {
  type: "satin";
  /** `[x, y]` shift of each copy. Default: `[4, 4]` (px). */
  offset?: readonly [x: Length, y: Length];
  /** Softness of the copies. Default: `8` (px). */
  size?: Length;
  /** Paint where the copies agree instead. Default: `false`. */
  invert?: boolean;
  /** Remaps the strength of the shading through a curve, like the contour of Photoshop's layer styles. Default: none. */
  contour?: Contour;
}

/** Contour curves named after Photoshop's presets of a similar shape (not exact copies). */
export type ContourPreset =
  | "linear"
  | "cone"
  | "cone-inverted"
  | "gaussian"
  | "half-round"
  | "ring"
  | "ring-double"
  | "sawtooth";

/**
 * A curve from `0`–`1` to `0`–`1`, applied to opacity (`Layer.contour`) or shading strength (`Shading.contour`): a
 * preset, or `[input, output]` points joined by a smooth curve.
 */
export type Contour = ContourPreset | readonly (readonly [input: number, output: number])[];

/**
 * Varies how strongly a layer paints its shape, computed from the distance to the shape's edge. The shape is the
 * layer's own (the glyph grown by `stroke`), and lengths are on screen, so they don't turn with sideways glyphs in
 * vertical text; `{ em }` lengths are relative to the run's font size. Shading is computed per glyph: shaded outlines
 * of overlapping neighbours show a seam.
 */
export type Shading = InsetShading | BevelShading | SatinShading;

/**
 * How a layer blends with what is below it, as in Photoshop and CSS `mix-blend-mode`. Colors are blended where the
 * layer meets lower layers; over transparent parts the layer shows as it is.
 * - `normal`, `add` (light builds up), `screen` and `erase` (cuts the layer's shape out of what is below) are blended
 *   by the GPU directly.
 * - The others read the pixels below the layer, which in a WebGL renderer needs `useBackBuffer: true`
 *   (`TextRenderer` handles that).
 */
export type BlendMode =
  | "normal"
  | "add"
  | "screen"
  | "erase"
  | "multiply"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity"
  | "linear-burn"
  | "linear-dodge"
  | "linear-light"
  | "vivid-light"
  | "pin-light"
  | "hard-mix"
  | "subtract"
  | "divide";

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
  /** Any paint, or a `ShapeGradient` colored by the distance from the glyph's edge. */
  paint: LayerPaint;
  /**
   * How a layer that paints the glyph itself (no `stroke`, `shading` or shape gradient) draws color glyphs, such as
   * emoji and the glyphs of color fonts: `"keep"` draws them in their own colors, `"paint"` paints their shape with
   * `paint` like any other glyph. Outlines, shadows and other grown or shaded layers always use the glyph's shape.
   * `fill()` sets `"keep"`. Default: `"paint"`.
   */
  colorGlyphs?: "keep" | "paint";
  /**
   * How far the glyph shape grows, or the band width for `"inside"` and `"center"`. `0` paints the glyph itself.
   * `{ em }` is relative to the run's font size, so the outline follows `shrink` and mixed font sizes. Default: `0`.
   */
  stroke?: Length;
  /** Default: `"outside"`. */
  strokePosition?: StrokePosition;
  /** Corner shape of the stroke. Default: `"round"`. Non-uniform `scaleX`/`scaleY` always renders round joins. */
  join?: CanvasLineJoin;
  /** Default: `10`. */
  miterLimit?: number;
  /** Paints the shape with a varying strength (inner shadow, inner glow, bevel, satin). Always renders round joins. */
  shading?: Shading;
  /** `[x, y]` shift of the layer, e.g. for a drop shadow. `{ em }` is relative to the run's font size. Default: `[0, 0]`. */
  offset?: readonly [x: Length, y: Length];
  /**
   * Blur strength (PixiJS `BlurFilter` strength in px, or `{ em }` relative to the run's font size), the same at any
   * resolution. The drawn area grows to fit the whole blur. Default: `0`.
   */
  blur?: Length;
  /** PixiJS `BlurFilter` quality (number of passes). Default: `4`. */
  blurQuality?: number;
  /**
   * Remaps the opacity of the merged layer after the blur, like a contour in Photoshop's layer styles: `"ring"` turns
   * a glow into a ring, `"cone"` into a halo with a soft inside. Default: none (`"linear"`).
   */
  contour?: Contour;
  /** `0`–`1`: random speckles in the layer's opacity, after the contour, as in Photoshop's glows. Default: `0`. */
  noise?: number;
  /** Opacity of the whole layer, applied after its glyphs are merged. Default: `1`. */
  opacity?: number;
  /**
   * How the merged layer blends with the layers, plate and decorations below it (not with what is behind the caption).
   * Default: `"normal"`.
   */
  blendMode?: BlendMode;
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
  /**
   * Decoration layers, bottom → top. Default: `[{ paint: "#ffffff", colorGlyphs: "keep" }]` (a white fill that keeps
   * emoji in color).
   */
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
   * `[x, y]` padding around the text, or one value for both. `{ em }` lengths here and below are relative to the base
   * style's font size after `shrink`. Default: 24 px along the lines and 12 px across them (`[24, 12]` in horizontal
   * text, `[12, 24]` in vertical text).
   */
  padding?: Length | readonly [x: Length, y: Length];
  /** Corner radius, clamped to half the plate's size. Default: `0`. */
  radius?: Length;
  /**
   * Slants the plate into a parallelogram, in degrees: its edge on the over side (the top, or the right in vertical
   * text) moves toward the end of the lines. Default: `0`.
   */
  skew?: number;
  /** A border centered on the plate's edge. */
  stroke?: { width: Length; paint: Paint };
  /** One plate around the whole block, or one per line. Default: `"block"`. */
  mode?: "block" | "line";
  /** `[x, y]` shift. Default: `[0, 0]`. */
  offset?: readonly [x: Length, y: Length];
  /** Blur strength, as for layers. Default: `0`. */
  blur?: Length;
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
  /**
   * Index of its word, `-1` for whitespace: a phrase (文節) in Japanese, such as 「今日は」 or 「最高の」, or a word with
   * its punctuation in spaced text. Use it to animate word by word.
   */
  wordIndex: number;
  /** Number of words. */
  wordCount: number;
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
  /** Clockwise rotation of the glyph in degrees, about the center of its cell: the path's direction with `textPath`, else `0`. */
  angle: number;
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
  /**
   * Sets the lines along a path instead of straight, horizontal text only. The path's length is the line length
   * unless `maxWidth` is set. `arcPath()` builds a circular one.
   */
  textPath?: TextPath;
}

/** A circular arc around the origin, for `TextPath.arc`. */
export interface TextPathArc {
  /** Radius in px. */
  radius: number;
  /** Where the middle of the arc is, in degrees clockwise from the top. Default: `0` (the top). */
  center?: number;
  /** How much of the circle the arc spans, in degrees. Default: `360`. */
  sweep?: number;
  /**
   * Direction the text runs. Clockwise reads left to right over the top of the circle; counterclockwise reads left to
   * right along the bottom, with the glyphs' tops toward the center. Default: `"clockwise"`.
   */
  direction?: "clockwise" | "counterclockwise";
}

/**
 * A path the lines run along (text on a path). Give either `d` or `arc`. The first line sits on the path; later lines
 * follow it at their distance from the first line.
 */
export interface TextPath {
  /** SVG path data in px, e.g. `"M0 100 Q200 0 400 100"`. Only its first subpath is used. */
  d?: string;
  /** A circular arc around the origin, instead of `d`. */
  arc?: TextPathArc;
  /** Where along the path the line starts, in px or em. Default: `0`. */
  startOffset?: Length;
  /**
   * Which side of the path the glyphs stand on: `left` of the direction it runs (above a path running left to right),
   * or `right`, which walks it backward. Default: `"left"`.
   */
  side?: "left" | "right";
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
  /**
   * Bends the glyphs, like Photoshop's warp text: a style with a bend, or an envelope of 16 points. Outlines are grown
   * after the warp, so they stay even. Plates and box decorations aren't warped.
   */
  warp?: Warp;
}

/** Warp styles, named after Photoshop's and similar in spirit; the exact shapes differ. */
export type WarpStyle =
  | "arc"
  | "arc-lower"
  | "arc-upper"
  | "arch"
  | "bulge"
  | "flag"
  | "wave"
  | "rise"
  | "fisheye"
  | "inflate"
  | "squeeze"
  | "twist";

/** A warp style, bent by `bend` over the box around the text. */
export interface WarpPreset {
  style: WarpStyle;
  /** `-1`–`1`: how strongly, and which way (Photoshop's bend of −100% to 100%). Default: `0.5`. */
  bend?: number;
  /** `-1`–`1`: makes the left side taller and the right side shorter, or the other way. Default: `0`. */
  horizontalDistortion?: number;
  /** `-1`–`1`: makes the top wider and the bottom narrower, or the other way. Default: `0`. */
  verticalDistortion?: number;
  /** Bends along the width (`horizontal`) or along the height (`vertical`). Default: `"horizontal"`. */
  direction?: "horizontal" | "vertical";
}

/**
 * A free-form warp: the box around the text becomes a bicubic Bézier patch with these 16 control points, as fractions
 * of the box (`[0, 0]` its top left, `[1, 1]` its bottom right), in 4 rows of 4 from the top left. The points of an
 * unwarped box are `[column / 3, row / 3]`.
 */
export interface WarpEnvelope {
  envelope: readonly (readonly [x: number, y: number])[];
}

/** How `TextNodeProps.warp` bends the glyphs. */
export type Warp = WarpPreset | WarpEnvelope;

/**
 * A box along a run of text, behind or in front of its glyphs: a marker (蛍光ペン), a highlight or a frame. One box is
 * drawn per line the run spans. `marker()` and `frame()` build common ones.
 */
export interface BoxDecoration {
  type: "box";
  /** Fill of the box. Gradients and patterns span each box. Default: none. */
  paint?: Paint;
  /** A border centered on the box's edge. */
  stroke?: { width: Length; paint: Paint };
  /**
   * The part of the em box the box covers across the line, as fractions from its over side (`0`, the top, or the right
   * in vertical text) to its under side (`1`). `[0.5, 1]` covers the lower half. Default: `[0, 1]`.
   */
  inset?: readonly [from: number, to: number];
  /**
   * `[along, across]` the line, or one value for both, added around the box. `{ em }` lengths here and below are
   * relative to the largest font size of the run's glyphs on the line. Default: `0`.
   */
  padding?: Length | readonly [along: Length, across: Length];
  /** Corner radius, clamped to half the box's size. Default: `0`. */
  radius?: Length;
  /** Slants the box into a parallelogram, in degrees, like `PlateStyle.skew`. Default: `0`. */
  skew?: number;
  /** Behind the glyphs (above the plate), or in front of them. Default: `"behind"`. */
  placement?: "behind" | "front";
  /** `[x, y]` shift. Default: `[0, 0]`. */
  offset?: readonly [x: Length, y: Length];
  /** Blur strength, as for layers. Default: `0`. */
  blur?: Length;
  /** Default: `1`. */
  opacity?: number;
  /** How the box blends with what is below it in the caption, as for layers. Default: `"normal"`. */
  blendMode?: BlendMode;
  /** Extra PixiJS filters, compared by identity like `Layer.filters`. */
  filters?: readonly Filter[];
}

/**
 * A line along a run of text: an underline, overline or line-through. It is part of the text's shape, so the run's
 * layers paint it: outlines wrap the text and the line together, and a line under differently colored runs takes
 * each run's colors. `underline()`, `overline()` and `lineThrough()` build these.
 */
export interface LineDecoration {
  type: "line";
  /**
   * - `under`: below the em box (left of it in vertical text)
   * - `over`: above the em box (right of it in vertical text, where Japanese puts 傍線)
   * - `through`: across the middle of the em box
   * - `auto`: `under` in horizontal text, `over` in vertical text
   * Default: `"auto"`.
   */
  position?: "auto" | "under" | "over" | "through";
  /** Thickness of the line. Default: `{ em: 0.06 }`. */
  thickness?: Length;
  /**
   * Gap between the em box and the line for `under` and `over`; for `through`, a shift of the line toward the under
   * side. Default: `{ em: 0.05 }` for `under` and `over`, `0` for `through`.
   */
  offset?: Length;
  /**
   * - `solid`: one line
   * - `double`: two lines, a thickness apart
   * - `dotted`: round dots
   * - `dashed`: dashes
   * - `wavy`: a wave, two thicknesses high
   * Default: `"solid"`.
   */
  style?: "solid" | "double" | "dotted" | "dashed" | "wavy";
}

/** Something drawn along runs of text: a line (underline, line-through) or a box (marker, frame). */
export type Decoration = LineDecoration | BoxDecoration;
