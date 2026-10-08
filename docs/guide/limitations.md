---
description: Known limitations of tixi, covering horizontal text only, no ligatures, how overlapping outlines of different colors combine, and font declaration requirements.
---

# Limitations

## Horizontal text only

tixi lays out horizontal text. Vertical writing (縦書き) is planned.

## No ligatures

Glyphs are drawn one cluster at a time, which is what lets each one be outlined and animated on its own. Ligatures such as `fi`, and contextual alternates, are therefore never formed. Kerning is still applied.

Scripts that depend on shaping across characters, such as Arabic and the Indic scripts, won't render correctly. Japanese, Chinese, Korean and Latin text are fine.

## Overlapping outlines of different colors

Within one layer slot, glyphs merge with `max` blending, and per color channel the brighter value wins. When a pink outline overlaps a blue one in the same slot, the overlap shows a mix of the two rather than one cleanly on top.

This rarely shows at normal letter spacing. When it does, give the overlapping runs different effects, such as a slightly different `opacity` (`0.999`), so they render as separate groups.

## Fonts must be declared before drawing

tixi loads the font faces and subsets a caption needs, but only from `@font-face` rules that already exist. If a caption is drawn before your font stylesheet loads, it silently uses a fallback font. See [Fonts](./fonts).

## WebGL is required

Composition runs on PixiJS with WebGL. Headless Chrome needs `--gl=angle` (`Config.setChromiumOpenGlRenderer("angle")` in Remotion).
