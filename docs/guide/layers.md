---
description: The layer model behind every fill, outline, shadow and glow, with stroke position, joins, offsets, blur, opacity, blend modes and PixiJS filters.
---

# Layers

Every decoration in tellu is a **layer**: the glyph's shape, grown by `stroke` pixels and painted with `paint`. A fill is a layer with no stroke. An outline is a layer with a stroke, and a shadow is an outline that has been offset and blurred.

`style.layers` lists them **bottom to top**:

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "重ねる",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 96,
    layers: [
      stroke(30, "#ff3d8b"), // bottom: the widest outline
      stroke(20, "#ffffff"),
      stroke(10, "#1b2a7a"),
      fill("#ffe14d"), // top: the glyph itself
    ],
  },
};
```

Each outline must be wider than the one above it, or it is hidden underneath. Think of it as stacking paper cutouts, from largest to smallest.

## Layer helpers

Layers are plain objects, and four helpers cover the common cases:

| Helper | Same as |
| --- | --- |
| `fill(paint, options?)` | `{ paint, stroke: 0, ...options }` |
| `stroke(width, paint, options?)` | `{ paint, stroke: width, ...options }` |
| `shadow({ color, offset, blur, stroke })` | A layer offset by `[4, 4]` and blurred by `4`, in `rgba(0,0,0,0.6)` by default |
| `glow({ color, stroke, blur })` | A white layer grown by `8` and blurred by `8` by default |

Every option of a layer can go in the last argument: `fill("#fff", { opacity: 0.8 })`.

## Outlines merge

Layers are composited **per slot**: tellu draws the bottom layer of *every* glyph, then the next layer of every glyph, and so on. Outlines of neighbouring glyphs therefore melt into one shape, and a glyph's outline never covers the fill of the glyph before it. Telop software works the same way.

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "ギュッと詰める",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 84,
    letterSpacing: -14,
    layers: [stroke(22, "#111111"), stroke(12, "#ffffff"), fill("#ff4b2b")],
  },
};
```

Even with glyphs pulled together by `letterSpacing: -14`, every white outline sits below every red fill.

## Shadows

A shadow is a layer with `offset` and `blur`. Give it the same `stroke` as your widest outline and it becomes the shadow of the whole outlined caption, not just of the glyphs:

```ts demo compare
import { fill, shadow, stroke } from "tellu";

const base = { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 64 };

export default {
  "shadow()": {
    text: "影の形",
    style: {
      ...base,
      layers: [shadow({ offset: [6, 8] }), stroke(16, "#222"), fill("#fff")],
    },
  },
  "shadow({ stroke: 16 })": {
    text: "影の形",
    style: {
      ...base,
      layers: [
        shadow({ offset: [6, 8], stroke: 16 }),
        stroke(16, "#222"),
        fill("#fff"),
      ],
    },
  },
  "hard shadow, blur: 0": {
    text: "影の形",
    style: {
      ...base,
      layers: [
        shadow({ offset: [8, 8], blur: 0, stroke: 16, color: "#ff3d8b" }),
        stroke(16, "#222"),
        fill("#fff"),
      ],
    },
  },
};
```

`blur` is a PixiJS `BlurFilter` strength in CSS pixels, and `blurQuality` (default `4`) is its number of passes. tellu grows the drawn area to fit the whole blur, so soft shadows are never cropped.

## Glows

A glow is a blurred, grown layer with no offset. Stack two for a richer halo:

```ts demo
import { fill, glow, stroke } from "tellu";

export default {
  text: "きらめく夜",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 88,
    layers: [
      glow({ color: "#ff8fd3", stroke: 18, blur: 18 }),
      glow({ color: "#ffffff", stroke: 6, blur: 6, opacity: 0.8 }),
      stroke(6, "#ff5fae"),
      fill("#ffffff"),
    ],
  },
};
```

## Stroke position

By default a stroke grows the glyph **outward**, and the grown shape includes the glyph's interior. `strokePosition` changes that to a band:

| `strokePosition` | Draws |
| --- | --- |
| `"outside"` (default) | The glyph grown by `stroke`, interior included |
| `"inside"` | A band of width `stroke` along the inner edge of the glyph |
| `"center"` | A band of width `stroke` centred on the outline |

```ts demo compare
import { fill, stroke } from "tellu";

const base = { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 80 };

export default {
  outside: {
    text: "縁",
    style: { ...base, layers: [stroke(8, "#4cc9f0"), fill("#0d1b2a")] },
  },
  inside: {
    text: "縁",
    style: {
      ...base,
      layers: [
        fill("#0d1b2a"),
        stroke(6, "#4cc9f0", { strokePosition: "inside" }),
      ],
    },
  },
  "center (no fill)": {
    text: "縁",
    style: {
      ...base,
      layers: [stroke(4, "#4cc9f0", { strokePosition: "center" })],
    },
  },
};
```

An inside stroke sits *on top of* the fill, so put it after the fill in `layers`.

## Joins

`join` sets how a stroke turns corners: `"round"` (the default), `"miter"` or `"bevel"`. `miterLimit` (default `10`) caps how far miter joins may reach.

```ts demo compare
import { fill, stroke } from "tellu";

const style = (join: CanvasLineJoin) => ({
  fontFamily: "Montserrat",
  fontWeight: 900,
  fontSize: 72,
  layers: [stroke(14, "#ffcf3d", { join }), fill("#1b2a7a")],
});

export default {
  round: { text: "AWK", style: style("round") },
  miter: { text: "AWK", style: style("miter") },
  bevel: { text: "AWK", style: style("bevel") },
};
```

::: info
With non-uniform scaling (`scaleX` ≠ `scaleY`), strokes always use round joins. See [Typography](./typography#condensed-and-expanded-glyphs).
:::

## Opacity

A layer's `opacity` applies to the merged layer as a whole, after all glyphs are combined. Overlapping outlines don't get darker where they cross:

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "半透明の縁取り",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 80,
    letterSpacing: -10,
    layers: [stroke(20, "#000000", { opacity: 0.45 }), fill("#ffffff")],
  },
};
```

## Blend modes

`blendMode` blends a layer against the layers below it, using any PixiJS blend mode. `"add"` makes light build up, which suits neon:

```ts demo
import { fill, glow, stroke } from "tellu";

export default {
  text: "OPEN 24H 営業中",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      glow({ color: "#ff00b3", stroke: 10, blur: 24, blendMode: "add" }),
      glow({ color: "#7a5cff", stroke: 4, blur: 8, blendMode: "add" }),
      stroke(3, "#ffb3ec"),
      fill("#ffffff"),
    ],
  },
  background: { paint: "#120a1f", padding: [36, 22], radius: 18 },
};
```

## PixiJS filters

Need something tellu doesn't do? Put any PixiJS filter on a layer with `filters`:

```ts demo
import { NoiseFilter } from "pixi.js";
import { fill, shadow, stroke } from "tellu";

const grain = new NoiseFilter({ noise: 0.45, seed: 0.37 });

export default {
  text: "ざらざら質感",
  style: {
    fontFamily: "Reggae One",
    fontSize: 84,
    layers: [
      shadow({ color: "#000", offset: [5, 7], blur: 2, stroke: 12 }),
      stroke(12, "#5b2c06"),
      fill("#f4e3c1", { filters: [grain] }),
    ],
  },
};
```

::: warning Create filters once
tellu compares filters by identity. Create them outside your render function or component body, as above. A new filter instance on every frame forces a full rebuild every frame.
:::

## Hiding and naming layers

- `visible: false` skips a layer without removing it, for example to toggle a shadow.
- `id` names a layer so [rich-text runs](./rich-text#patching-layers) can target it by name instead of by index.

## Options

| Option | Type | Default | |
| --- | --- | --- | --- |
| `paint` | [`Paint`](./paint) | | Color, gradient or pattern |
| `stroke` | `number` | `0` | Growth in px. `0` paints the glyph itself |
| `strokePosition` | `"outside" \| "inside" \| "center"` | `"outside"` | |
| `join` | `CanvasLineJoin` | `"round"` | |
| `miterLimit` | `number` | `10` | |
| `offset` | `[x, y]` | `[0, 0]` | |
| `blur` | `number` | `0` | PixiJS `BlurFilter` strength, in CSS px |
| `blurQuality` | `number` | `4` | Blur passes |
| `opacity` | `number` | `1` | Applied to the merged layer |
| `blendMode` | PixiJS `BLEND_MODES` | `"normal"` | Against the layers below |
| `filters` | PixiJS `Filter[]` | | |
| `visible` | `boolean` | `true` | |
| `id` | `string` | | Target for run patches |

See [`Layer`](/api/types#layer) in the API reference.
