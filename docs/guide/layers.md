---
description: The layer model behind every fill, outline, shadow and glow, with inner shadows, bevels and satin, stroke position, joins, offsets, blur, opacity, blend modes and PixiJS filters.
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

Every option of a layer can go in the last argument: `fill("#fff", { opacity: 0.8 })`. Four more helpers shade the inside of the glyph: [`innerShadow()` and `innerGlow()`](#inner-shadows-and-glows), [`bevel()`](#bevels) and [`satin()`](#satin).

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

### Contours

`contour` remaps a layer's opacity through a curve after it is blurred, like the contour of Photoshop's layer styles. Opacity runs from `1` next to the glyph to `0` where the blur fades out, so the curve decides how the glow falls off. `"ring"` lifts the middle of the falloff and drops the part next to the glyph, which turns a glow into a halo standing off the text:

```ts demo compare backdrop=night
import { type Contour, fill, glow } from "tellu";

const sample = (contour?: Contour) => ({
  text: "ネオン",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      glow({ color: "#00e5ff", stroke: 10, blur: 10, contour }),
      fill("#ffffff"),
    ],
  },
});

export default {
  "no contour": sample(),
  '"ring"': sample("ring"),
  '"ring-double"': sample("ring-double"),
  "custom points": sample([
    [0, 0],
    [0.3, 1],
    [0.6, 0],
    [1, 1],
  ]),
};
```

The presets are `"linear"`, `"cone"`, `"cone-inverted"`, `"gaussian"`, `"half-round"`, `"ring"`, `"ring-double"` and `"sawtooth"`, named after Photoshop's presets of a similar shape. For your own curve, pass `[input, output]` points, which are joined by a smooth curve. A curve that doesn't start at `0`, such as `"cone-inverted"`, paints where the opacity is just above zero too, which gives the glow a hard outer edge where its blur ends.

### Noise

`noise` (`0`–`1`) speckles a layer's opacity, as in Photoshop's glows and shadows. The speckles are fixed to the pixels, so the same frame always renders the same:

```ts demo backdrop=night
import { fill, glow } from "tellu";

export default {
  text: "ざらつく光",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      glow({ color: "#ffbe0b", stroke: 12, blur: 12, noise: 0.6 }),
      fill("#ffffff"),
    ],
  },
};
```

Contours and noise work on any layer, after its blur and filters and before its opacity.

## Inner shadows and glows

`innerShadow()` darkens the inside of the shape along the edge it was shifted away from, and `innerGlow()` lights the whole inner edge:

```ts demo compare
import { fill, innerGlow, innerShadow, stroke } from "tellu";

const base = { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 80 };

export default {
  "innerShadow()": {
    text: "凹み",
    style: {
      ...base,
      layers: [stroke(8, "#1b2a7a"), fill("#ffffff"), innerShadow()],
    },
  },
  "hard, size: 0": {
    text: "凹み",
    style: {
      ...base,
      layers: [
        stroke(8, "#1b2a7a"),
        fill("#ffe14d"),
        innerShadow({ size: 0, offset: [5, 5], color: "#ff7a00" }),
      ],
    },
  },
  "innerGlow()": {
    text: "凹み",
    style: {
      ...base,
      layers: [
        stroke(8, "#ffffff"),
        fill("#0b6cff"),
        innerGlow({ color: "#bde4ff", size: 10 }),
      ],
    },
  },
};
```

Both fade out over `size` px from the edge (`4` for `innerShadow()`, `8` for `innerGlow()`), and `size: 0` gives a hard edge. `innerShadow()` is shifted by `[4, 4]` in `rgba(0,0,0,0.6)` by default, and `innerGlow()` is white.

They paint inside the layer's shape only, so put them above the layer they shade. Their `offset` shifts the shadow inside the shape; it isn't the layer's `offset`, which would move the whole layer. With `stroke`, they shade the glyph grown by that width, such as an outline. Keep shaded outlines apart, as with `letterSpacing` here, or each glyph's shading shows across its neighbour's (see [How shading works](#how-shading-works)):

```ts demo
import { fill, innerShadow, stroke } from "tellu";

export default {
  text: "フチに影",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 88,
    letterSpacing: 24,
    layers: [
      stroke(12, "#ff3d8b"),
      innerShadow({ stroke: 12, offset: [3, 3], size: 3 }),
      fill("#ffffff"),
    ],
  },
};
```

## Bevels

`bevel()` makes the glyph look raised by lighting a bevel along its edge. It returns two layers, the highlight and the shadow side, so spread it into `layers`:

```ts demo
import { bevel, fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "金メダル",
  style: {
    fontFamily: "Noto Serif JP",
    fontWeight: 900,
    fontSize: 96,
    layers: [
      shadow({ offset: [4, 6], stroke: 10 }),
      stroke(10, "#3b2200"),
      fill(linearGradient(["#fff7c2", "#f5c542", "#b8860b", "#ffe9a0"])),
      ...bevel({ size: 5 }),
    ],
  },
};
```

| Option | Default | |
| --- | --- | --- |
| `size` | `4` | Width of the bevel in px |
| `angle` | `315` | Direction the light comes from, in degrees clockwise from the top (`315` = top left) |
| `depth` | `1` | Steepness; higher values make the lighting stronger |
| `technique` | `"smooth"` | `"smooth"` rounds the bevel into the flat inside; `"chisel"` cuts flat faces with a sharp ridge |
| `highlight` | `"rgba(255,255,255,0.8)"` | Paint of the faces turned toward the light |
| `shadow` | `"rgba(0,0,0,0.5)"` | Paint of the faces turned away from it |
| `stroke` | `0` | Bevel the glyph grown by this width |

```ts demo compare
import { bevel, fill, stroke } from "tellu";

const base = { fontFamily: "Dela Gothic One", fontSize: 96 };

export default {
  smooth: {
    text: "銀",
    style: { ...base, layers: [fill("#b9c2cc"), ...bevel({ size: 8 })] },
  },
  chisel: {
    text: "銀",
    style: {
      ...base,
      layers: [fill("#b9c2cc"), ...bevel({ size: 8, technique: "chisel" })],
    },
  },
  "outline, stroke: 10": {
    text: "銀",
    style: {
      ...base,
      layers: [
        stroke(10, "#4a5866"),
        ...bevel({ stroke: 10, size: 4, depth: 2 }),
        fill("#ffffff"),
      ],
    },
  },
};
```

A light from the opposite side (`angle: 135`) makes the glyph look sunken instead of raised. For an outer bevel or an emboss, bevel an outline layer with `stroke`, as in the last example.

## Satin

`satin()` paints silky bands inside the shape, where two copies of it shifted by `offset` and by `-offset` and softened by `size` differ. `invert: true` paints where they agree instead:

```ts demo compare
import { fill, satin, stroke } from "tellu";

const base = { fontFamily: "Zen Maru Gothic", fontWeight: 900, fontSize: 96 };

export default {
  "satin()": {
    text: "シルク",
    style: {
      ...base,
      layers: [stroke(6, "#5b1240"), fill("#e0569b"), satin()],
    },
  },
  "invert: true": {
    text: "シルク",
    style: {
      ...base,
      layers: [
        stroke(6, "#5b1240"),
        fill("#e0569b"),
        satin({ color: "rgba(255,255,255,0.5)", invert: true }),
      ],
    },
  },
};
```

`satin()` defaults to `offset: [4, 4]` and `size: 8` in `rgba(0,0,0,0.5)`.

### How shading works

These helpers return ordinary layers with a `shading` property, which varies how strongly the layer paints its shape. `innerShadow()` is the same as:

```ts
{
  paint: "rgba(0,0,0,0.6)",
  stroke: 0,
  shading: { type: "inset", offset: [4, 4], size: 4 },
}
```

Shading is computed from each glyph's distance field, the same one round strokes are grown from, so it stays even on 長体 and 平体 glyphs, and its offsets and light direction stay in screen space for sideways glyphs in vertical text. The layer's own `offset`, `blur` and `opacity` still apply on top. See [`Shading`](/api/types#shading) for every option.

Shading takes a `contour` too, which remaps its strength: on a bevel it shapes the lighting like Photoshop's gloss contour, and on an inner glow it shapes the fade. `innerShadow()`, `innerGlow()`, `bevel()` and `satin()` put their `contour` option on the shading.

Each glyph is shaded on its own. Where shaded outlines of neighbouring glyphs overlap, each one's bevel or inner shadow shows inside the other, as a seam across the merged outline. Shading the fill, or an outline narrow enough not to overlap its neighbours, avoids this.

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
  layers: [stroke(14, "#ffd000", { join }), fill("#1b2a7a")],
});

export default {
  round: { text: "AWK", style: style("round") },
  miter: { text: "AWK", style: style("miter") },
  bevel: { text: "AWK", style: style("bevel") },
};
```

::: info
With non-uniform scaling (`scaleX` ≠ `scaleY`), strokes always use round joins. See [Typography](./typography#condensed-and-expanded-glyphs). So do layers with `shading`.
:::

Round strokes are grown from the glyph's visible shape. Miter and bevel strokes use the browser's `strokeText`, which follows every contour in the font, including ones that overlap inside the glyph, and can leave small holes when a wide stroke overruns a small counter such as the loop of す.

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
| `paint` | [`LayerPaint`](/api/types#layerpaint) | | Color, gradient, pattern or [shape gradient](./paint#shape-gradients) |
| `stroke` | `number` | `0` | Growth in px. `0` paints the glyph itself |
| `strokePosition` | `"outside" \| "inside" \| "center"` | `"outside"` | |
| `join` | `CanvasLineJoin` | `"round"` | |
| `miterLimit` | `number` | `10` | |
| `shading` | [`Shading`](/api/types#shading) | | Inner shadow, inner glow, bevel or satin |
| `offset` | `[x, y]` | `[0, 0]` | |
| `blur` | `number` | `0` | PixiJS `BlurFilter` strength, in CSS px |
| `blurQuality` | `number` | `4` | Blur passes |
| `contour` | [`Contour`](/api/types#contour) | | Remaps the opacity after the blur. [Contours](#contours) |
| `noise` | `number` | `0` | Speckles the opacity, `0`–`1`. [Noise](#noise) |
| `opacity` | `number` | `1` | Applied to the merged layer |
| `blendMode` | PixiJS `BLEND_MODES` | `"normal"` | Against the layers below |
| `filters` | PixiJS `Filter[]` | | |
| `visible` | `boolean` | `true` | |
| `id` | `string` | | Target for run patches |

See [`Layer`](/api/types#layer) in the API reference.

