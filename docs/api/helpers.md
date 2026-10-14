---
description: API reference for layer helpers (fill, stroke, shadow, glow, extrude, echo, innerShadow, innerGlow, bevel, satin), decoration helpers (underline, overline, lineThrough, marker, frame), gradient helpers (linear, radial, conic, diamond, shape), arcPath, parseMarkup, style override utilities and defaults.
---

# Style helpers

## Layers

### `fill()`

```ts
function fill(paint: LayerPaint, options?: Omit<Layer, "paint" | "stroke">): Layer;
```

A layer that paints the glyph itself (`stroke: 0`). Emoji and other color glyphs keep their own colors (`colorGlyphs: "keep"`); pass `colorGlyphs: "paint"` to paint them as silhouettes. See [Emoji and color glyphs](/guide/layers#emoji-and-color-glyphs).

### `stroke()`

```ts
function stroke(width: Length, paint: LayerPaint, options?: Omit<Layer, "paint" | "stroke">): Layer;
```

The glyph grown by `width`: px, or `{ em }` of the font size, which follows [`shrink`](/guide/fitting#shrink). See [`strokePosition`](/guide/layers#stroke-position) for inside and centred strokes.

### `shadow()`

```ts
function shadow(options?: ShadowOptions): Layer;
```

### `ShadowOptions`

All [`Layer`](./types#layer) options except `paint` and `stroke`, plus:

| Option | Default | |
| --- | --- | --- |
| `color` | `"rgba(0,0,0,0.6)"` | Any paint |
| `offset` | `[4, 4]` | |
| `stroke` | `0` | Grow the shadow shape, e.g. to match the widest outline |
| `blur` | `4` | |

### `glow()`

```ts
function glow(options?: GlowOptions): Layer;
```

### `GlowOptions`

All [`Layer`](./types#layer) options except `paint` and `stroke`, plus:

| Option | Default | |
| --- | --- | --- |
| `color` | `"#ffffff"` | Any paint |
| `stroke` | `8` | |
| `blur` | `8` | |

### `extrude()`

```ts
function extrude(options?: ExtrudeOptions): Layer;
```

Extruded text (立体文字): a layer with [`repeat`](./types#layerrepeat) copies of the glyph stacked `depth` px deep toward `angle`, a pixel apart. Put it first, below the outlines. See [Extrusion and echoes](/guide/layers#extrusion-and-echoes).

### `ExtrudeOptions`

All [`Layer`](./types#layer) options except `paint`, `stroke` and `repeat`, plus:

| Option | Default | |
| --- | --- | --- |
| `color` | `"#000000"` | Any paint |
| `depth` | `12` | In px |
| `angle` | `135` | Direction in degrees clockwise from the top: `180` is straight down |
| `stroke` | `0` | Extrude the glyph grown by this much, e.g. the widest outline |
| `shade` | | Tint of the back of the extrusion, to shade it |

### `echo()`

```ts
function echo(options?: EchoOptions): Layer;
```

Fading copies of the glyph trailing behind it, each `offset` from the one in front. Put it first, below the other layers.

### `EchoOptions`

All [`Layer`](./types#layer) options except `paint`, `stroke`, `offset` and `repeat`, plus:

| Option | Default | |
| --- | --- | --- |
| `color` | `"#ffffff"` | Any paint |
| `count` | `3` | Number of echoes |
| `offset` | `[6, 6]` | Shift of each echo from the one in front |
| `fade` | `0.25` | Opacity of the farthest echo, relative to the nearest |
| `stroke` | `0` | Echo the glyph grown by this much |
| `opacity` | `0.6` | Opacity of all the echoes |

### `innerShadow()`

```ts
function innerShadow(options?: InnerShadowOptions): Layer;
```

A layer with [`InsetShading`](./types#insetshading): the inside of the shape, darkened along the edge the shadow is shifted away from. See [Inner shadows and glows](/guide/layers#inner-shadows-and-glows).

### `InnerShadowOptions`

All [`Layer`](./types#layer) options except `paint`, `stroke`, `offset` and `shading`, plus:

| Option | Default | |
| --- | --- | --- |
| `color` | `"rgba(0,0,0,0.6)"` | Any paint |
| `offset` | `[4, 4]` | Shift of the shadow inside the shape, not of the layer |
| `size` | `4` | Width of the fade in px. `0` is a hard edge |
| `contour` | | Remaps the shading's strength ([`Contour`](./types#contour)). Goes on the shading, not the layer |
| `stroke` | `0` | Shade the glyph grown by this width, e.g. an outline |

### `innerGlow()`

```ts
function innerGlow(options?: InnerGlowOptions): Layer;
```

A layer with [`InsetShading`](./types#insetshading) and no offset: the inside of the shape, lit along its whole edge.

### `InnerGlowOptions`

All [`Layer`](./types#layer) options except `paint`, `stroke` and `shading`, plus:

| Option | Default | |
| --- | --- | --- |
| `color` | `"#ffffff"` | Any paint |
| `size` | `8` | Width of the fade in px |
| `contour` | | Remaps the shading's strength ([`Contour`](./types#contour)). Goes on the shading, not the layer |
| `stroke` | `0` | Light the glyph grown by this width, e.g. an outline |

### `bevel()`

```ts
function bevel(options?: BevelOptions): [highlight: Layer, shadow: Layer];
```

Two layers with [`BevelShading`](./types#bevelshading), the highlight side and the shadow side. Spread them into `layers`: `[fill("#f5c542"), ...bevel()]`. See [Bevels](/guide/layers#bevels).

### `BevelOptions`

All [`Layer`](./types#layer) options except `paint`, `stroke` and `shading`, which apply to both layers, plus:

| Option | Default | |
| --- | --- | --- |
| `highlight` | `"rgba(255,255,255,0.8)"` | Paint of the faces turned toward the light |
| `shadow` | `"rgba(0,0,0,0.5)"` | Paint of the faces turned away from the light |
| `size` | `4` | Width of the bevel in px |
| `angle` | `315` | Direction the light comes from, in degrees clockwise from the top |
| `depth` | `1` | Steepness of the bevel |
| `technique` | `"smooth"` | `"smooth"` or `"chisel"` |
| `contour` | | Remaps the shading's strength ([`Contour`](./types#contour)). Goes on the shading, not the layer |
| `stroke` | `0` | Bevel the glyph grown by this width, e.g. an outline |

### `satin()`

```ts
function satin(options?: SatinOptions): Layer;
```

A layer with [`SatinShading`](./types#satinshading). See [Satin](/guide/layers#satin).

### `SatinOptions`

All [`Layer`](./types#layer) options except `paint`, `stroke`, `offset` and `shading`, plus:

| Option | Default | |
| --- | --- | --- |
| `color` | `"rgba(0,0,0,0.5)"` | Any paint |
| `offset` | `[4, 4]` | Shift of each copy of the shape, not of the layer |
| `size` | `8` | Softness of the copies in px |
| `invert` | `false` | Paint where the copies agree instead |
| `contour` | | Remaps the shading's strength ([`Contour`](./types#contour)). Goes on the shading, not the layer |
| `stroke` | `0` | Shade the glyph grown by this width, e.g. an outline |

## Text paths

### `arcPath()`

```ts
function arcPath(
  radius: number,
  options?: Omit<TextPathArc, "radius"> & Pick<TextPath, "startOffset" | "side">,
): TextPath;
```

A circular [`TextPath`](./types#textpath) of `radius` px. By default the text runs clockwise over the top of a full circle; `{ center: 180, direction: "counterclockwise" }` runs it along the bottom, reading left to right. Guide: [Arcs](/guide/text-path#arcs).

## Decorations

### `underline()`

```ts
function underline(options?: LineDecorationOptions): LineDecoration;
```

A line under the em box in horizontal text and on its right in vertical text (`position: "auto"`), painted with the run's layers. Guide: [Lines](/guide/decorations#lines).

### `overline()`

```ts
function overline(options?: Omit<LineDecorationOptions, "position">): LineDecoration;
```

A line above the em box (on its right in vertical text).

### `lineThrough()`

```ts
function lineThrough(options?: Omit<LineDecorationOptions, "position">): LineDecoration;
```

A line through the middle of the em box (打ち消し線).

### `LineDecorationOptions`

Every [`LineDecoration`](./types#linedecoration) option except `type`.

### `marker()`

```ts
function marker(paint: Paint, options?: Omit<BoxDecorationOptions, "paint">): BoxDecoration;
```

A box painted with `paint` behind the lower half of the em box: `inset: [0.5, 1]`, `padding: [2, 0]`. Guide: [Markers and highlights](/guide/decorations#markers-and-highlights).

### `frame()`

```ts
function frame(paint: Paint, options?: Omit<BoxDecorationOptions, "stroke"> & { width?: Length }): BoxDecoration;
```

A box with a border of `width` px (default `3`) painted with `paint`, and no fill: `padding: [4, 2]`. Guide: [Frames](/guide/decorations#frames).

### `BoxDecorationOptions`

Every [`BoxDecoration`](./types#boxdecoration) option except `type`.

## Gradients

### `linearGradient()`

```ts
function linearGradient(
  stops: readonly ColorValue[] | readonly GradientStopInput[],
  options?: { angle?: number; reflect?: boolean; scope?: PaintScope },
): LinearGradient;
```

Plain colors are spread evenly from 0 to 1. `angle` is a CSS angle in degrees (default `180`, top → bottom). `reflect: true` runs the stops from the middle out to both ends (default `false`). `scope` defaults to `"line"`. Guide: [Paint](/guide/paint#linear-gradients).

### `radialGradient()`

```ts
function radialGradient(
  stops: readonly ColorValue[] | readonly GradientStopInput[],
  options?: { center?: readonly [number, number]; radius?: number; scope?: PaintScope },
): RadialGradient;
```

`center` is relative to the scope box (default `[0.5, 0.5]`). `radius` multiplies the distance to the farthest corner (default `1`).

### `shapeGradient()`

```ts
function shapeGradient(
  stops: readonly ColorValue[] | readonly GradientStopInput[],
  options?: { size?: Length; reverse?: boolean },
): ShapeGradient;
```

Plain colors are spread evenly from the glyph's edge (0) to the far edge of the layer (1). On a layer with no `stroke`, the stops end `size` px inside the glyph (default `8`). `reverse: true` runs them from the far edge back (default `false`). Only layers take it. Guide: [Shape gradients](/guide/paint#shape-gradients).

### `conicGradient()`

```ts
function conicGradient(
  stops: readonly ColorValue[] | readonly GradientStopInput[],
  options?: { angle?: number; center?: readonly [number, number]; scope?: PaintScope },
): ConicGradient;
```

Plain colors are spread evenly clockwise from 0 to 1. `angle` is where the stops start, in degrees clockwise from the top (default `0`). `center` is relative to the scope box (default `[0.5, 0.5]`). `scope` defaults to `"line"`. Guide: [Paint](/guide/paint#conic-gradients).

### `diamondGradient()`

```ts
function diamondGradient(
  stops: readonly ColorValue[] | readonly GradientStopInput[],
  options?: { center?: readonly [number, number]; radius?: number; angle?: number; scope?: PaintScope },
): DiamondGradient;
```

Plain colors are spread evenly from the center (0) out to the diamond through the scope box's farthest corner (1). `radius` scales the diamond (default `1`), `angle` turns it clockwise in degrees (default `0`), and `center` is relative to the scope box (default `[0.5, 0.5]`). `scope` defaults to `"line"`. Guide: [Paint](/guide/paint#diamond-gradients).

## Markup

### `parseMarkup()`

```ts
function parseMarkup(markup: string, tags?: Readonly<Record<string, StyleOverride>>): RunObject[];
```

Parses `<tag>…</tag>` markup into runs, with the style override of each enclosing tag. Tags nest, and inner tags win. `<br/>` inserts a line break. `&lt;` `&gt;` `&amp;` `&quot;` `&#39;` are unescaped. Throws on unclosed or unexpected closing tags. Each run's `tags` lists its enclosing tags, outermost first.

Guide: [Rich text](/guide/rich-text#markup).

## Style overrides

### `applyOverride()`

```ts
function applyOverride(base: TextStyle, override: StyleOverride | undefined): TextStyle;
```

Applies a run's override to a full style. `layers` replaces when it is an array and patches by index or `id` when it is an object. `decorations` are added after the base style's, skipping equal ones. `undefined` values are ignored.

### `mergeOverrides()`

```ts
function mergeOverrides(outer: StyleOverride | undefined, inner: StyleOverride | undefined): StyleOverride | undefined;
```

Combines two overrides, with `inner` winning. Layer patches are merged key by key, and decorations add up, outer first. This is how nested markup tags combine.

## Defaults

### `defaultStyle`

```ts
const defaultStyle: TextStyle = {
  fontFamily: "sans-serif",
  fontSize: 64,
  fontWeight: "normal",
  fontStyle: "normal",
  letterSpacing: 0,
  tsume: 0,
  scaleX: 1,
  scaleY: 1,
  lineHeight: 1.2,
  kerning: true,
  baselineShift: 0,
  textOrientation: "mixed",
  textCombineUpright: "digits 2",
  layers: [{ paint: "#ffffff", colorGlyphs: "keep" }],
  decorations: [],
};
```

### `resolveStyle()`

```ts
function resolveStyle(style: Partial<TextStyle> | undefined): TextStyle;
```

`defaultStyle` with `style` applied, ignoring `undefined` values.

### `defaultKinsoku`

The default [`KinsokuRules`](./types#kinsokurules):

| Set | Characters |
| --- | --- |
| `lineStart` | `,)]}、〕〉》」』】〙〗〟’”｠»ヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻‐゠–〜～?!‼⁇⁈⁉・:;/。.，．：；？！）］｝` |
| `lineEnd` | `([{〔〈《「『【〘〖〝‘“｟«（［｛` |
| `inseparable` | `—…‥〳〴〵` |
| `hanging` | `、。,.，．` |
