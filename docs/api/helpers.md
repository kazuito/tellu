---
description: API reference for layer helpers (fill, stroke, shadow, glow), gradient helpers, parseMarkup, style override utilities and defaults.
---

# Style helpers

## Layers

### `fill()`

```ts
function fill(paint: Paint, options?: Omit<Layer, "paint" | "stroke">): Layer;
```

A layer that paints the glyph itself (`stroke: 0`).

### `stroke()`

```ts
function stroke(width: number, paint: Paint, options?: Omit<Layer, "paint" | "stroke">): Layer;
```

The glyph grown by `width` px. See [`strokePosition`](/guide/layers#stroke-position) for inside and centred strokes.

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

## Gradients

### `linearGradient()`

```ts
function linearGradient(
  stops: readonly ColorValue[] | readonly GradientStopInput[],
  options?: { angle?: number; scope?: PaintScope },
): LinearGradient;
```

Plain colors are spread evenly from 0 to 1. `angle` is a CSS angle in degrees (default `180`, top → bottom). `scope` defaults to `"line"`. Guide: [Paint](/guide/paint#linear-gradients).

### `radialGradient()`

```ts
function radialGradient(
  stops: readonly ColorValue[] | readonly GradientStopInput[],
  options?: { center?: readonly [number, number]; radius?: number; scope?: PaintScope },
): RadialGradient;
```

`center` is relative to the scope box (default `[0.5, 0.5]`). `radius` multiplies the distance to the farthest corner (default `1`).

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

Applies a run's override to a full style. `layers` replaces when it is an array and patches by index or `id` when it is an object. `undefined` values are ignored.

### `mergeOverrides()`

```ts
function mergeOverrides(outer: StyleOverride | undefined, inner: StyleOverride | undefined): StyleOverride | undefined;
```

Combines two overrides, with `inner` winning. Layer patches are merged key by key. This is how nested markup tags combine.

## Defaults

### `defaultStyle`

```ts
const defaultStyle: TextStyle = {
  fontFamily: "sans-serif",
  fontSize: 64,
  fontWeight: "normal",
  fontStyle: "normal",
  letterSpacing: 0,
  scaleX: 1,
  scaleY: 1,
  lineHeight: 1.2,
  kerning: true,
  baselineShift: 0,
  layers: [{ paint: "#ffffff" }],
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
