---
description: Type reference for TextNodeProps, LayoutOptions, writing modes, TextStyle, Layer, Paint, PlateStyle, runs, kinsoku rules, GlyphContext, GlyphTransform and Box.
---

# Types

Every type is exported from `tellu`:

```ts
import type { Layer, TextNodeProps, TextStyle } from "tellu";
```

## Props

### `TextNodeProps`

Everything that describes a caption. Taken by [`TextNode`](./rendering#textnode) and [`createCanvasText()`](./rendering#createcanvastext), and, with `style` renamed to `textStyle`, by `<Text>`.

```ts
interface TextNodeProps extends LayoutOptions {
  background?: PlateStyle;
  glyphTransform?: GlyphTransformFn;
}
```

| Prop | Type | |
| --- | --- | --- |
| `background` | [`PlateStyle`](#platestyle) | A plate behind the text. [Guide](/guide/plates) |
| `glyphTransform` | [`GlyphTransformFn`](#glyphtransformfn) | Per-glyph transform. [Guide](/guide/animation) |

…plus every option of [`LayoutOptions`](#layoutoptions).

### `LayoutOptions`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `text` | [`TextContent`](#textcontent) | | Required |
| `style` | `Partial<`[`TextStyle`](#textstyle)`>` | [`defaultStyle`](./helpers#defaultstyle) | |
| `writingMode` | [`WritingMode`](#writingmode) | `"horizontal-tb"` | |
| `maxWidth` | `number` | | Layout box width. In horizontal text it is the line length and enables wrapping; in vertical text it only bounds `shrink` |
| `maxHeight` | `number` | | Layout box height. In vertical text it is the line length and enables wrapping; in horizontal text it only bounds `shrink` |
| `wrap` | [`TextWrap`](#textwrap) | `"auto"` | How lines wrap at the line length. Without one, every mode keeps only explicit line breaks |
| `align` | [`TextAlign`](#textalign) | `"start"` | |
| `overflow` | [`Overflow`](#overflow) | `"visible"` | |
| `minScale` | `number` | `0.3` | Smallest scale `shrink` / `squeeze` may apply |
| `maxLines` | `number` | | Truncates, or bounds `shrink` |
| `kinsoku` | `boolean \| Partial<`[`KinsokuRules`](#kinsokurules)`>` | `true` | |
| `lineBreak` | [`LineBreak`](#linebreak) | `"char"` | |
| `punctuationTrim` | [`PunctuationTrim`](#punctuationtrim) | `"none"` | Trims the blank half of fullwidth punctuation at line edges (約物の半角取り) |
| `autospace` | `boolean \| `[`Length`](#length) | `false` | Space between kana or kanji and Latin letters or digits (和欧間アキ). `true` is a quarter em of the smaller font |
| `locale` | `string` | `"ja"` | Segmentation locale |

Guides: [Line breaking](/guide/line-breaking), [Fitting text](/guide/fitting), [Vertical writing](/guide/vertical).

### `WritingMode`

```ts
type WritingMode = "horizontal-tb" | "vertical-rl" | "vertical-lr";
```

As in CSS `writing-mode`: `vertical-rl` stacks lines right → left (縦書き), `vertical-lr` left → right.

### `TextAlign`

```ts
type TextAlign =
  | "start"
  | "center"
  | "end"
  | "justify"
  | "justify-all"
  | "left"
  | "right"
  | "top"
  | "bottom";
```

Position of each line along the line direction. `start` / `end` follow the writing mode; `left` / `top` mean `start` and `right` / `bottom` mean `end` in either direction.

`justify` fills the line length on every line except the last one and lines ended by `\n`. `justify-all` fills it on every line (均等配置), spreading to the longest line when there is no line length. [Guide](/guide/line-breaking#alignment).

### `Overflow`

```ts
type Overflow = "visible" | "shrink" | "squeeze";
```

- `visible`: lines may overflow the line length.
- `shrink`: the font scales down until the text fits `maxWidth`, `maxHeight` and `maxLines`.
- `squeeze`: overflowing lines are condensed along the line (長体で収める).

### `LineBreak`

```ts
type LineBreak = "char" | "phrase";
```

- `char`: break between any CJK characters.
- `phrase`: keep Japanese phrases (文節) together, using `Intl.Segmenter`.

### `TextWrap`

```ts
type TextWrap = "auto" | "none" | "balance" | "pretty";
```

- `auto`: fill each line before breaking.
- `none`: break only at `\n`.
- `balance`: make the lines of each paragraph about equally long.
- `pretty`: avoid a last line with a single word, phrase or character (泣き別れ).

Paragraphs are separated by `\n`. `balance` and `pretty` change only where lines break; alignment and justification still use the full line length. [Guide](/guide/line-breaking#balanced-lines).

### `PunctuationTrim`

```ts
type PunctuationTrim = "none" | "start" | "end" | "both";
```

Trims the blank half of fullwidth punctuation at the edges of lines (約物の半角取り). [Guide](/guide/line-breaking#punctuation-at-line-edges-約物の半角取り).

- `start`: opening brackets at the start of a line.
- `end`: closing brackets, 、 and 。 at the end of a line. One that only fits trimmed stays on the line.
- `both`: both.

### `KinsokuRules`

| Field | |
| --- | --- |
| `lineStart` | Characters that must not start a line (行頭禁則) |
| `lineEnd` | Characters that must not end a line (行末禁則) |
| `inseparable` | Characters that must not be split when repeated (分離禁止), e.g. `……` |
| `hanging` | Characters that may hang past `maxWidth` (ぶら下げ) |

Defaults: [`defaultKinsoku`](./helpers#defaultkinsoku).

## Style

### `TextStyle`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `fontFamily` | `string \| readonly string[]` | `"sans-serif"` | |
| `fontSize` | `number` | `64` | |
| `fontWeight` | [`FontWeight`](#fontweight) | `"normal"` | |
| `fontStyle` | [`FontStyle`](#fontstyle) | `"normal"` | |
| `letterSpacing` | [`Length`](#length) | `0` | Extra space after each character |
| `tsume` | `number` | `0` | `0`–`1`: removes that fraction of the blank space on both sides of each kana, kanji and fullwidth character (文字ツメ). [Guide](/guide/typography#tsume-文字ツメ) |
| `scaleX` | `number` | `1` | Horizontal glyph scale (長体 < 1 < 平体) |
| `scaleY` | `number` | `1` | Vertical glyph scale |
| `lineHeight` | [`LineHeight`](#lineheight) | `1.2` | |
| `kerning` | `boolean` | `true` | |
| `baselineShift` | [`Length`](#length) | `0` | Raises glyphs (moves them right in vertical text) |
| `textOrientation` | [`TextOrientation`](#textorientation) | `"mixed"` | Vertical text only |
| `textCombineUpright` | [`TextCombineUpright`](#textcombineupright) | `"digits 2"` | Vertical text only: 縦中横 |
| `layers` | `readonly `[`Layer`](#layer)`[]` | `[{ paint: "#ffffff" }]` | Bottom → top |

Guide: [Typography](/guide/typography).

### `TextOrientation`

```ts
type TextOrientation = "mixed" | "upright" | "sideways";
```

Glyph orientation in vertical text, as in CSS `text-orientation`. [Guide](/guide/vertical#glyph-orientation).

### `TextCombineUpright`

```ts
type TextCombineUpright = "none" | "all" | "digits" | "digits 2" | "digits 3" | "digits 4";
```

縦中横 in vertical text, as in CSS `text-combine-upright`: `all` combines each run of this style, and `digits N` combines runs of at most N (default 2) ASCII digits.

### `FontWeight`

```ts
type FontWeight = number | "normal" | "bold" | "bolder" | "lighter";
```

### `FontStyle`

```ts
type FontStyle = "normal" | "italic" | "oblique";
```

### `Length`

```ts
type Length = number | { em: number };
```

Pixels, or a multiple of the font size.

### `LineHeight`

```ts
type LineHeight = number | { px: number };
```

A multiple of the font size, or absolute pixels.

### `Layer`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `paint` | [`Paint`](#paint) | | Required |
| `stroke` | `number` | `0` | Growth in px |
| `strokePosition` | [`StrokePosition`](#strokeposition) | `"outside"` | |
| `join` | `CanvasLineJoin` | `"round"` | Non-uniform scaling always uses round joins |
| `miterLimit` | `number` | `10` | |
| `offset` | `readonly [x, y]` | `[0, 0]` | |
| `blur` | `number` | `0` | PixiJS `BlurFilter` strength |
| `blurQuality` | `number` | `4` | |
| `opacity` | `number` | `1` | Applied to the merged layer |
| `blendMode` | PixiJS `BLEND_MODES` | `"normal"` | |
| `filters` | `readonly Filter[]` | | PixiJS filters |
| `visible` | `boolean` | `true` | |
| `id` | `string` | | Target for layer patches |

Guide: [Layers](/guide/layers).

### `StrokePosition`

```ts
type StrokePosition = "outside" | "inside" | "center";
```

## Paint

### `Paint`

```ts
type Paint = ColorValue | LinearGradient | RadialGradient | PatternPaint;
```

Guide: [Paint](/guide/paint).

### `ColorValue`

```ts
type ColorValue = string | number; // any CSS color, or 0xRRGGBB
```

### `LinearGradient`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"linear"` | | |
| `stops` | `readonly `[`GradientStopInput`](#gradientstopinput)`[]` | | |
| `angle` | `number` | `180` | CSS angle in degrees |
| `scope` | [`PaintScope`](#paintscope) | `"line"` | |

### `RadialGradient`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"radial"` | | |
| `stops` | `readonly GradientStopInput[]` | | |
| `center` | `readonly [number, number]` | `[0.5, 0.5]` | Relative to the scope box |
| `radius` | `number` | `1` | Factor of the distance to the farthest corner |
| `scope` | `PaintScope` | `"line"` | |

### `PatternPaint`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"pattern"` | | |
| `source` | `CanvasImageSource` | | A loaded image, canvas or bitmap |
| `repetition` | `"repeat" \| "repeat-x" \| "repeat-y" \| "no-repeat"` | `"repeat"` | |
| `scale` | `number` | `1` | |
| `offset` | `readonly [number, number]` | `[0, 0]` | |
| `scope` | `PaintScope` | `"block"` | |

### `GradientStop`

```ts
interface GradientStop {
  offset: number;
  color: ColorValue;
}
```

### `GradientStopInput`

```ts
type GradientStopInput = GradientStop | readonly [offset: number, color: ColorValue];
```

### `PaintScope`

```ts
type PaintScope = "glyph" | "line" | "block";
```

The box a gradient or pattern spans: each character's em box, each line's content box, or the whole block.

## Rich text

### `TextContent`

```ts
type TextContent = string | readonly Run[];
```

### `Run`

```ts
type Run = string | RunObject;
```

### `RunObject`

| Property | Type | |
| --- | --- | --- |
| `text` | `string` | |
| `style` | [`StyleOverride`](#styleoverride) | |
| `tags` | `readonly string[]` | Markup tags, outermost first. Exposed to `glyphTransform` |

### `StyleOverride`

```ts
type StyleOverride = Partial<Omit<TextStyle, "layers">> & {
  /** An array replaces all layers; an object patches layers by index or `id`. */
  layers?: readonly Layer[] | LayerPatch;
};
```

### `LayerPatch`

```ts
type LayerPatch = { readonly [indexOrId: string]: Partial<Layer> };
```

Guide: [Patching layers](/guide/rich-text#patching-layers).

## Plates

### `PlateStyle`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `paint` | `Paint` | | Required |
| `padding` | `number \| readonly [x, y]` | 24 along the lines, 12 across | `[24, 12]` in horizontal text, `[12, 24]` in vertical |
| `radius` | `number` | `0` | Clamped to half the plate size |
| `stroke` | `{ width: number; paint: Paint }` | | |
| `mode` | `"block" \| "line"` | `"block"` | One plate, or one per line |
| `offset` | `readonly [x, y]` | `[0, 0]` | |
| `blur` | `number` | `0` | |
| `opacity` | `number` | `1` | |
| `filters` | `readonly Filter[]` | | |

Guide: [Background plates](/guide/plates).

## Glyph animation

### `GlyphTransformFn`

```ts
type GlyphTransformFn = (glyph: GlyphContext) => GlyphTransform | void | undefined;
```

### `GlyphContext`

| Field | |
| --- | --- |
| `index`, `count` | Among all characters, whitespace included |
| `visibleIndex`, `visibleCount` | Among non-whitespace characters (`visibleIndex` is `-1` for whitespace) |
| `lineIndex`, `lineCount` | |
| `indexInLine`, `lineLength` | |
| `text` | The grapheme cluster |
| `runIndex` | |
| `tags` | Markup tags of its run |
| `isWhitespace` | |
| `x`, `y`, `width`, `height` | The glyph's cell in layout coordinates: its advance along the line × the font's extent across it |

### `GlyphTransform`

| Field | Default | |
| --- | --- | --- |
| `x`, `y` | `0` | Offset in px |
| `scale` | `1` | Multiplies `scaleX` and `scaleY` |
| `scaleX`, `scaleY` | `1` | |
| `rotation` | `0` | Degrees |
| `skewX`, `skewY` | `0` | Degrees |
| `opacity` | `1` | |
| `visible` | `true` | |
| `origin` | `[0.5, 0.5]` | Relative to the glyph box |

Guide: [Glyph transforms](/guide/animation).

## Geometry

### `Box`

```ts
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

A rectangle in layout coordinates, used by [`LayoutGlyph`](./layout#layoutglyph) and [`LayoutLine`](./layout#layoutline).
