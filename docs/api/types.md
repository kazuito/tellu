---
description: Type reference for TextNodeProps, warps, LayoutOptions, writing modes, TextStyle, Layer, Shading, Paint, PlateStyle, decorations, runs, kinsoku rules, GlyphContext, GlyphTransform and Box.
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
  warp?: Warp;
}
```

| Prop | Type | |
| --- | --- | --- |
| `background` | [`PlateStyle`](#platestyle) | A plate behind the text. [Guide](/guide/plates) |
| `glyphTransform` | [`GlyphTransformFn`](#glyphtransformfn) | Per-glyph transform. [Guide](/guide/animation) |
| `warp` | [`Warp`](#warp) | Bends the glyphs. [Guide](/guide/warp) |

…plus every option of [`LayoutOptions`](#layoutoptions).

### `Warp`

```ts
type Warp = WarpPreset | WarpEnvelope;
```

How `warp` bends the glyphs: a style, or an envelope. The glyphs are bent before they are outlined, so outlines keep an even width. Plates and box decorations aren't warped. [Guide](/guide/warp).

### `WarpPreset`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `style` | [`WarpStyle`](#warpstyle) | | Required |
| `bend` | `number` | `0.5` | `-1`–`1`: how strongly, and which way |
| `horizontalDistortion` | `number` | `0` | `-1`–`1`: a positive value makes the left side taller and the right side shorter |
| `verticalDistortion` | `number` | `0` | `-1`–`1`: a positive value makes the top wider and the bottom narrower |
| `direction` | `"horizontal" \| "vertical"` | `"horizontal"` | Bend along the width or along the height |

### `WarpStyle`

```ts
type WarpStyle =
  | "arc" | "arc-lower" | "arc-upper" | "arch" | "bulge" | "flag"
  | "wave" | "rise" | "fisheye" | "inflate" | "squeeze" | "twist";
```

Named after Photoshop's warp styles and similar in spirit; the exact shapes differ. [Guide](/guide/warp#styles).

### `WarpEnvelope`

```ts
interface WarpEnvelope {
  envelope: readonly (readonly [x: number, y: number])[];
}
```

16 control points of a bicubic Bézier patch, as fractions of the box around the text (`[0, 0]` top left, `[1, 1]` bottom right), in 4 rows of 4 from the top left. An unwarped box has them at `[column / 3, row / 3]`. [Guide](/guide/warp#envelopes).

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
| `textPath` | [`TextPath`](#textpath) | | Sets the lines along a path. Horizontal text only. The path's length is the line length unless `maxWidth` is set. [Guide](/guide/text-path) |

Guides: [Line breaking](/guide/line-breaking), [Fitting text](/guide/fitting), [Vertical writing](/guide/vertical), [Text on a path](/guide/text-path).

### `TextPath`

A path the lines run along. Give `d` or `arc`; [`arcPath()`](./helpers#arcpath) builds an arc. The first line sits on the path, and later lines follow it at their distance from the first line.

| Property | Type | Default | |
| --- | --- | --- | --- |
| `d` | `string` | | SVG path data in px. Only the first subpath is used |
| `arc` | [`TextPathArc`](#textpatharc) | | A circular arc around the origin, instead of `d` |
| `startOffset` | [`Length`](#length) | `0` | Where along the path the line starts |
| `side` | `"left" \| "right"` | `"left"` | Which side of the path the glyphs stand on, walking it from its start. `right` walks it backward |

### `TextPathArc`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `radius` | `number` | | Required, in px |
| `center` | `number` | `0` | Where the middle of the arc is, in degrees clockwise from the top |
| `sweep` | `number` | `360` | How much of the circle the arc spans, in degrees |
| `direction` | `"clockwise" \| "counterclockwise"` | `"clockwise"` | Clockwise reads left to right over the top; counterclockwise reads left to right along the bottom |

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
| `layers` | `readonly `[`Layer`](#layer)`[]` | `[{ paint: "#ffffff", colorGlyphs: "keep" }]` | Bottom → top |
| `decorations` | `readonly `[`Decoration`](#decoration)`[]` | `[]` | Lines, markers and frames along the text. A run's decorations add to the ones it inherits. [Guide](/guide/decorations) |

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
| `paint` | [`LayerPaint`](#layerpaint) | | Required |
| `colorGlyphs` | `"keep" \| "paint"` | `"paint"` | `"keep"` draws emoji and other color glyphs in their own colors, on layers that paint the glyph itself. [Guide](/guide/layers#emoji-and-color-glyphs) |
| `stroke` | `number` | `0` | Growth in px |
| `strokePosition` | [`StrokePosition`](#strokeposition) | `"outside"` | |
| `join` | `CanvasLineJoin` | `"round"` | Non-uniform scaling always uses round joins |
| `miterLimit` | `number` | `10` | |
| `shading` | [`Shading`](#shading) | | Paints the shape with a varying strength. Always uses round joins |
| `offset` | `readonly [x, y]` | `[0, 0]` | |
| `blur` | `number` | `0` | PixiJS `BlurFilter` strength |
| `blurQuality` | `number` | `4` | |
| `contour` | [`Contour`](#contour) | | Remaps the merged layer's opacity after the blur. [Guide](/guide/layers#contours) |
| `noise` | `number` | `0` | `0`–`1`: speckles the opacity, after the contour. [Guide](/guide/layers#noise) |
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

### `Shading`

```ts
type Shading = InsetShading | BevelShading | SatinShading;
```

Varies how strongly a layer paints its shape, computed from the distance to the shape's edge. The shape is the layer's: the glyph grown by `stroke`, at its `strokePosition`. Lengths are in px, in screen space, so they stay put when glyphs are rotated in vertical text.

Guide: [Inner shadows and glows](/guide/layers#inner-shadows-and-glows), [Bevels](/guide/layers#bevels), [Satin](/guide/layers#satin).

### `Contour`

```ts
type ContourPreset =
  | "linear" | "cone" | "cone-inverted" | "gaussian"
  | "half-round" | "ring" | "ring-double" | "sawtooth";
type Contour = ContourPreset | readonly (readonly [input: number, output: number])[];
```

A curve from `0`–`1` to `0`–`1`, for `Layer.contour` and the `contour` of each shading. Presets are named after Photoshop's of a similar shape; points are joined by a smooth curve, flat before the first and after the last. [Guide](/guide/layers#contours).

### `ContourPreset`

The named [`Contour`](#contour) curves.

### `InsetShading`

Paints the edge of the shape, fading toward its inside (inner shadow, inner glow).

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"inset"` | | Required |
| `offset` | `readonly [x, y]` | `[0, 0]` | Shift of the edge the fade starts from |
| `size` | `number` | `4` | Width of the fade. `0` is a hard edge |
| `contour` | [`Contour`](#contour) | | Remaps the strength through a curve |

### `BevelShading`

Lights the shape as if its edge were beveled, and paints its lit or its shaded side. Flat parts of the shape, farther than `size` from the edge, are not painted.

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"bevel"` | | Required |
| `side` | `"highlight" \| "shadow"` | `"highlight"` | Faces turned toward or away from the light |
| `size` | `number` | `4` | Width of the bevel |
| `angle` | `number` | `315` | Direction the light comes from, in degrees clockwise from the top (`315` = top left) |
| `depth` | `number` | `1` | Steepness; higher values make the lighting stronger |
| `technique` | `"smooth" \| "chisel"` | `"smooth"` | Rounded, or flat faces with a sharp ridge |
| `contour` | [`Contour`](#contour) | | Remaps the strength through a curve |

### `SatinShading`

Silky bands inside the shape, where two copies of the softened shape, shifted by `offset` and by `-offset`, differ.

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"satin"` | | Required |
| `offset` | `readonly [x, y]` | `[4, 4]` | Shift of each copy |
| `size` | `number` | `8` | Softness of the copies |
| `invert` | `boolean` | `false` | Paint where the copies agree instead |
| `contour` | [`Contour`](#contour) | | Remaps the strength through a curve |

## Paint

### `Paint`

```ts
type Paint = ColorValue | LinearGradient | RadialGradient | ConicGradient | DiamondGradient | PatternPaint;
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
| `reflect` | `boolean` | `false` | Run the stops from the middle (`0`) out to both ends (`1`). [Guide](/guide/paint#reflected-gradients) |
| `scope` | [`PaintScope`](#paintscope) | `"line"` | |

### `RadialGradient`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"radial"` | | |
| `stops` | `readonly GradientStopInput[]` | | |
| `center` | `readonly [number, number]` | `[0.5, 0.5]` | Relative to the scope box |
| `radius` | `number` | `1` | Factor of the distance to the farthest corner |
| `scope` | `PaintScope` | `"line"` | |

### `LayerPaint`

```ts
type LayerPaint = Paint | ShapeGradient;
```

What a [`Layer`](#layer) is painted with. Plates and decorations take a `Paint`.

### `ShapeGradient`

A gradient that follows the layer's shape (Photoshop's shape burst). Built by [`shapeGradient()`](./helpers#shapegradient). Guide: [Shape gradients](/guide/paint#shape-gradients).

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"shape"` | | |
| `stops` | `readonly GradientStopInput[]` | | From the glyph's edge (`0`) to the far edge of the layer (`1`): the outer edge of an outside stroke, the inner edge of an inside one, and the outer edge of a centered one, from its inner edge |
| `size` | `number` | `8` | For a layer with no `stroke`: how far inside the glyph the stops end, in px |
| `reverse` | `boolean` | `false` | Run the stops from the far edge back to the glyph's edge |

### `ConicGradient`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"conic"` | | |
| `stops` | `readonly GradientStopInput[]` | | Clockwise from `angle` (`0`) around to it again (`1`) |
| `angle` | `number` | `0` | Where the stops start, in degrees clockwise from the top |
| `center` | `readonly [number, number]` | `[0.5, 0.5]` | Relative to the scope box |
| `scope` | `PaintScope` | `"line"` | |

### `DiamondGradient`

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"diamond"` | | |
| `stops` | `readonly GradientStopInput[]` | | From the center (`0`) out to the diamond through the scope box's farthest corner (`1`) |
| `center` | `readonly [number, number]` | `[0.5, 0.5]` | Relative to the scope box |
| `radius` | `number` | `1` | Factor of the diamond's size |
| `angle` | `number` | `0` | Clockwise rotation in degrees |
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
| `skew` | `number` | `0` | Slant in degrees: the edge on the over side (top, or right in vertical text) moves toward the end of the lines |
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
| `angle` | Clockwise rotation in degrees about the cell's center: the path's direction with `textPath`, else `0` |

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

## Decorations

Guide: [Decorations](/guide/decorations).

### `Decoration`

```ts
type Decoration = LineDecoration | BoxDecoration;
```

Something drawn along runs of text, from a style's `decorations`.

### `LineDecoration`

An underline, overline or line-through. It is part of the text's shape: the run's layers paint it, and it restarts where they change. Built by [`underline()`](./helpers#underline), [`overline()`](./helpers#overline) and [`lineThrough()`](./helpers#linethrough).

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"line"` | | Required |
| `position` | `"auto" \| "under" \| "over" \| "through"` | `"auto"` | `under`: below the em box (left in vertical text). `over`: above it (right in vertical text). `through`: across its middle. `auto`: `under` in horizontal text, `over` in vertical text |
| `thickness` | [`Length`](#length) | `{ em: 0.06 }` | `em` is relative to the largest font size of the stretch |
| `offset` | `Length` | `{ em: 0.05 }`, `0` for `through` | Gap from the em box; for `through`, a shift toward the under side |
| `style` | `"solid" \| "double" \| "dotted" \| "dashed" \| "wavy"` | `"solid"` | `double` and `wavy` take three thicknesses across the line |

### `BoxDecoration`

A box along a run, one per line the run spans. Built by [`marker()`](./helpers#marker) and [`frame()`](./helpers#frame).

| Property | Type | Default | |
| --- | --- | --- | --- |
| `type` | `"box"` | | Required |
| `paint` | [`Paint`](#paint) | | Fill. Gradients and patterns span each box |
| `stroke` | `{ width: number; paint: Paint }` | | Border centered on the box's edge |
| `inset` | `readonly [from, to]` | `[0, 1]` | The part of the em box covered across the line, as fractions from its over side (top, or right in vertical text) to its under side |
| `padding` | `number \| readonly [along, across]` | `0` | Added around the box, in px |
| `radius` | `number` | `0` | Clamped to half the box's size |
| `skew` | `number` | `0` | Slant in degrees, as for plates |
| `placement` | `"behind" \| "front"` | `"behind"` | Behind the glyphs (above the plate), or in front of them |
| `offset` | `readonly [x, y]` | `[0, 0]` | |
| `blur` | `number` | `0` | |
| `opacity` | `number` | `1` | |
| `blendMode` | PixiJS `BLEND_MODES` | `"normal"` | |
| `filters` | `readonly Filter[]` | | PixiJS filters |

