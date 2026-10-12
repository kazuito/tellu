---
description: Known limitations of tellu, covering approximated vertical forms, no ruby, no ligatures, how overlapping outlines of different colors combine, per-glyph shading, and font declaration requirements.
---

# Limitations

## Vertical forms are approximated

Canvas 2D can't request a font's vertical glyph alternates (the OpenType `vert` feature). In [vertical text](./vertical), tellu rotates brackets and dashes and moves punctuation and small kana by their ink. That is close to Chrome's CSS rendering for typical Japanese fonts, but glyphs whose vertical forms differ more keep their horizontal shapes.

## No ruby

Ruby (furigana) isn't supported yet. A workaround is a separate small caption placed above (or beside) the base text.

## No ligatures

Glyphs are drawn one cluster at a time, which is what lets each one be outlined and animated on its own. Ligatures such as `fi`, and contextual alternates, are therefore never formed. Kerning is still applied.

Scripts that depend on shaping across characters, such as Arabic and the Indic scripts, won't render correctly. Japanese, Chinese, Korean and Latin text are fine.

## Overlapping outlines of different colors

Within one layer slot, glyphs merge with `max` blending, and per color channel the brighter value wins. When a pink outline overlaps a blue one in the same slot, the overlap shows a mix of the two rather than one cleanly on top.

This rarely shows at normal letter spacing. When it does, give the overlapping runs different effects, such as a slightly different `opacity` (`0.999`), so they render as separate groups.

## Shading is per glyph

[Inner shadows, inner glows, bevels and satin](./layers#how-shading-works) are computed from each glyph's own shape. Where shaded outlines of neighbouring glyphs overlap, the shading of each glyph's edge shows across the merged outline as a seam. Shade the fill, or an outline that doesn't overlap its neighbours.

## Fonts must be declared before drawing

tellu loads the font faces and subsets a caption needs, but only from `@font-face` rules that already exist. If a caption is drawn before your font stylesheet loads, it uses a fallback font. `<Text>` and `createCanvasText()` warn about it by default, and `fontCheck: "error"` makes it fail instead. See [Checking fonts](./fonts#checking-fonts).

## WebGL is required

Composition runs on PixiJS with WebGL. Headless Chrome needs `--gl=angle` (`Config.setChromiumOpenGlRenderer("angle")` in Remotion).
