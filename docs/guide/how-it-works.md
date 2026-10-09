---
description: The three-stage pipeline behind tellu (pure layout, Canvas 2D rasterization and PixiJS compositing), and why each design choice was made.
---

# How it works

tellu turns props into pixels in three stages:

```
props ──▶ layout ──▶ rasterize ──▶ compose ──▶ canvas
          (pure TS)  (Canvas 2D)   (PixiJS)
```

## 1. Layout

Layout is pure TypeScript with no DOM or PixiJS, and it takes an injected [`Measurer`](/api/layout#measurer) for text widths and font metrics.

1. **Runs** are resolved: each run's style override is applied to the base style.
2. **Segmentation** splits text into grapheme clusters with `Intl.Segmenter`, then marks where lines may break. Kinsoku rules veto some breaks, and in `"phrase"` mode breaks inside a phrase are demoted to fallbacks.
3. **Measurement** finds each glyph's advance. Kerning comes from measuring growing prefixes of each run, so it matches how the browser shapes the text in context. Prefixes restart every 64 characters (re-measuring the 16 before), which keeps long runs linear in cost. Kerning is stored separately from each glyph's own advance. That way it shifts the *next* glyph and is dropped at the start of a line.
4. **Line breaking** is greedy: fill a line until the next glyph overflows, then break at the last allowed position, hanging punctuation where permitted.
5. **Alignment**, justification and `squeeze` place each glyph on its line. `shrink` reruns this step with a binary-searched font scale.

All of this works in logical axes (*inline* along the line, *block* across lines) and maps to x / y only when glyphs are placed, so horizontal and [vertical text](./vertical) share the same line breaking, alignment and fitting. In vertical text, 縦中横 groups are merged into one cluster before line breaking, and each cluster is classified as upright, sideways or shifted.

The output, a [`Layout`](/api/layout#layout), is plain data. You can call [`layoutText()`](/api/layout#layouttext) yourself without rendering anything.

## 2. Rasterize

Each **glyph × layer** pair is drawn once with Canvas 2D into its own small bitmap:

- Fills use `fillText`. Strokes with uniform scale use native `strokeText` with the layer's join.
- Sideways glyphs in vertical text are rotated inside their bitmap, so paint, outlines and glyph transforms stay in screen space.
- With condensed or expanded glyphs (`scaleX` ≠ `scaleY`), stretching a native stroke would make it uneven. tellu instead renders the scaled glyph, builds a supersampled **signed distance field**, and grows it by the stroke width, so the outline stays the same width on every side.
- Gradients and patterns are positioned relative to their [scope](./paint#paint-scope) box (glyph, line or block), so a glyph-sized bitmap can still carry its slice of a line-wide gradient.

Bitmaps are cached by glyph, font, scale, sub-pixel offset (in quarter pixels), layer shape, paint and scope box. Repeated characters, and repeated renders, reuse them.

## 3. Compose

Bitmaps become PixiJS sprites grouped by **layer slot** and effects (offset, blur, opacity, blend mode, filters):

- Groups render in slot order, so every glyph's outline is below every glyph's fill.
- Inside a group, sprites combine with `max` blending, so overlapping outlines merge instead of stacking.
- Each group is isolated, then blurred, filtered, faded and blended as one image. That's why a semi-transparent outline doesn't darken where glyphs overlap.

Glyph transforms move, scale and rotate these sprites. When only `glyphTransform` changes, nothing is laid out or rasterized again.

## Output

A `TextNode` can live in your own PixiJS scene. For everything else, `TextRenderer` keeps **one offscreen WebGL renderer** for the whole page:

1. It renders a node in its local space,
2. then copies the region of the node's ink bounds into the target 2D canvas with `drawImage`, synchronously.

Every `<Text>` and `createCanvasText()` canvas is an ordinary 2D canvas, so hundreds of captions share a single WebGL context. Drawing is synchronous, so when `draw()` returns the pixels are there, which is exactly what Remotion's frame capture needs.

The offscreen renderer only grows, in power-of-two steps. Frequent resizing would discard PixiJS's pooled filter textures.
