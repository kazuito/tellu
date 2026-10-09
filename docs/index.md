---
layout: home
title: tellu
titleTemplate: Captions CSS can't draw

hero:
  name: tellu
  text: Captions CSS can't draw
  tagline: Broadcast-style telops for the web. Layered outlines, gradients, rich text and Japanese line breaking, rendered on PixiJS and made for Remotion.
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: Examples
      link: /examples/
    - theme: alt
      text: API
      link: /api/

features:
  - icon: 🧅
    title: Unlimited layers
    details: Outlines, shadows and glows are all layers, each with its own width, paint, offset, blur, opacity, blend mode and PixiJS filters.
    link: /guide/layers
  - icon: 🎨
    title: Gradients that span the line
    details: Linear and radial gradients and image patterns, stretched per glyph, per line or over the whole block, on fills and outlines alike.
    link: /guide/paint
  - icon: 🈁
    title: Japanese typesetting
    details: Vertical writing (縦書き) with 縦中横, kinsoku rules, hanging punctuation, phrase-aware breaking, and condensed glyphs (長体) whose outlines stay even.
    link: /guide/line-breaking
  - icon: ✍️
    title: Rich text
    details: Change the font, size, color or a single layer for part of a caption, with runs or simple <tag> markup.
    link: /guide/rich-text
  - icon: 🎞️
    title: Frame-accurate in Remotion
    details: <Text> holds each frame until fonts are loaded and the caption is drawn. No blank or fallback frames.
    link: /guide/remotion
  - icon: ⚡
    title: Cheap per-frame animation
    details: Per-glyph transforms move cached sprites. Nothing is laid out or rasterized again while you animate.
    link: /guide/animation
---

<div class="home-showcase">

## Everything here renders live

```ts demo backdrop=scene
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tellu";

export default {
  text: parseMarkup("縁取りも<em>グラデ</em>も、全部コードで。", {
    em: {
      fontSize: 88,
      layers: {
        3: { paint: linearGradient(["#ffffff", "#ffb3d1", "#ff2e7e"]) },
      },
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 64,
    layers: [
      shadow({
        color: "rgba(0,0,0,0.45)",
        offset: [7, 9],
        blur: 6,
        stroke: 20,
      }),
      stroke(20, "#14206b"),
      stroke(11, "#ffffff"),
      fill(linearGradient(["#fffbd1", "#ffe14d", "#ff9d00"])),
    ],
  },
};
```

```sh
bun add tellu pixi.js
```

[Read the guide →](/guide/introduction)

</div>
