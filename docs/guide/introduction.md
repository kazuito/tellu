---
description: What tellu is, what it draws that CSS can't, and how its pieces fit together.
---

# Introduction

**tellu** draws *telops*: the bold, outlined, shadowed captions of Japanese TV, YouTube edits and short-form video. It renders with [PixiJS](https://pixijs.com) and is made first for [Remotion](https://remotion.dev), but works anywhere a canvas does.

```ts demo
import { fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "今日もいい天気ですね！",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      shadow({ color: "rgba(0,0,0,0.5)", offset: [7, 9], blur: 6, stroke: 20 }),
      stroke(20, "#1b2a7a"),
      stroke(11, "#ffffff"),
      fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"])),
    ],
  },
};
```

Every rendering on this site is live. The code below each one is exactly what produced it.

## Why not CSS?

CSS gets you one `-webkit-text-stroke` and a few `text-shadow`s. Real captions need more:

| You want | CSS | tellu |
| --- | --- | --- |
| Two, three, five outlines of different colors | Stacked copies of the element | One `layers` array |
| An outline that casts its own blurred shadow | Not possible | `shadow({ stroke: 20 })` |
| A gradient across the whole line, not each glyph | `background-clip: text` (no outline) | `scope: "line"` |
| Neighbouring outlines that merge instead of overlapping fills | Not possible | Built in |
| Condensed glyphs (長体) with an even outline | `scale()` distorts the stroke | `scaleX: 0.8` |
| Japanese line breaking (禁則処理) and hanging punctuation | Partly, depends on the browser | Built in, deterministic |
| Vertical captions (縦書き) with 縦中横, all of the above included | `writing-mode`, without most of the above | `writingMode: "vertical-rl"` |
| Shrink to fit a box, frame-accurate | JavaScript measuring loops | `overflow: "shrink"` |
| Per-glyph animation without re-layout | One `<span>` per glyph | `glyphTransform` |

tellu also renders the same pixels in Chrome, in headless Chrome and on every frame, which matters when you render video.

## What's in the box

The package has three entry points:

- **`tellu`** is the core: style helpers, layout, and `TextNode`, a PixiJS container. It also has `TextRenderer` and `createCanvasText()` for drawing into any `<canvas>`.
- **`tellu/react`** exports `<Text>`, a component that draws into its own canvas.
- **`tellu/remotion`** exports the same `<Text>`, wired to `delayRender` so Remotion never captures a frame before the text is drawn.

## Core ideas

A caption is described by plain data. You can store it, diff it, generate it or send it over the wire:

```ts
const props = {
  text: "Hello",                          // a string, or rich-text runs
  style: { fontSize: 64, layers: [...] }, // font + decoration layers
  maxWidth: 800,                          // layout box (enables wrapping)
  align: "center",
  background: { paint: "#000a" },         // optional plate behind the text
  glyphTransform: (glyph) => ({ y: 0 }),  // optional per-glyph animation
};
```

Three ideas carry most of the API:

1. **[Layers](./layers)**: every decoration is the glyph shape, grown by some stroke width and painted. Fills, outlines, shadows and glows are all layers, stacked bottom to top.
2. **[Runs](./rich-text)**: part of the text can override any style property, including individual layers.
3. **[Glyph transforms](./animation)**: a function from each glyph to a transform. It runs every frame without re-rasterizing anything.

<llm-only>

## Rules for code generation

- In Remotion projects, import `Text` from `tellu/remotion` (it holds frames with `delayRender`), not `tellu/react`.
- `<Text>` takes the caption style as `textStyle`. Its `style` prop is the wrapper element's CSS.
- Remotion renders need `Config.setChromiumOpenGlRenderer("angle")` because PixiJS needs WebGL.
- Load font stylesheets before any caption is drawn. tellu cannot load faces whose `@font-face` rules don't exist yet, and silently falls back.
- `style.layers` is bottom → top. Each outline must be wider than the ones above it.

</llm-only>

## Next steps

- [Quick start](./quick-start): install and draw your first caption.
- [Remotion](./remotion): set up `tellu/remotion` in a video project.
- [Examples](/examples/): real-world captions to copy from.
