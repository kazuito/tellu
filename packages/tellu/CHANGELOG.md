# Changelog

All notable changes to `tellu` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0.0, a minor version may contain breaking changes.

## [Unreleased]

The first public release.

### Added

- Layered caption styles: any number of layers, each the glyph grown by `stroke` px and painted with `paint`, with its own `strokePosition`, `join`, `offset`, `blur`, `opacity`, `blendMode` and PixiJS `filters`. Layers are composited per slot, so the outlines of neighbouring glyphs merge.
- Layer helpers `fill()`, `stroke()`, `shadow()` and `glow()`.
- Paints: solid colors, `linearGradient()`, `radialGradient()` and image patterns, stretched per glyph, per line or over the whole block (`scope`).
- Rich text: runs that override the style or patch single layers by index or `id`, and `parseMarkup()` to build runs from `<tag>` markup.
- Typography: letter spacing, kerning, line height, baseline shift, and condensed or expanded glyphs (長体 / 平体, `scaleX` / `scaleY`) whose outlines keep an even width.
- Line breaking: automatic wrapping with Japanese kinsoku rules, hanging punctuation and optional phrase breaking (`lineBreak: "phrase"`), plus `align` (including `"justify"`) and `maxLines`.
- Fitting: `overflow: "shrink"` scales the font to fit, and `overflow: "squeeze"` compresses overflowing lines, both bounded by `minScale`.
- Vertical writing (縦書き): `writingMode: "vertical-rl"` and `"vertical-lr"`, `textOrientation`, and 縦中横 with `textCombineUpright`.
- Background plates (座布団) with `background`, drawn behind the whole block or behind each line.
- Per-glyph animation with `glyphTransform` (position, scale, rotation, skew, opacity, visibility), which moves cached sprites instead of re-rasterizing.
- Rendering entry points: `TextNode` for PixiJS scenes, `TextRenderer` (one shared offscreen WebGL renderer), `createCanvasText()` for a plain canvas, and `layoutText()` with a pluggable `Measurer` for layout without rendering.
- Font loading: `loadFonts()` loads only the font faces and `unicode-range` subsets a text uses, with `fontsReady()` to check whether they are loaded and `subscribeFontEpoch()` to react when fonts finish loading.
- `tellu/react`: `<Text>`, `TextRendererProvider` and `useTextRenderer()`.
- `tellu/remotion`: `<Text>`, which holds each frame with `delayRender` until the renderer, the fonts and the drawing are ready.

[Unreleased]: https://github.com/kazuito/tellu/commits/main
