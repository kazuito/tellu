# Changelog

All notable changes to `tellu` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0.0, a minor version may contain breaking changes.

## [Unreleased]

### Added

- Decorations: a style's `decorations` draws lines and boxes along runs of text. Decorations follow line breaks (one per line), justification, `shrink` and vertical writing. A run's decorations add to the ones it inherits from the base style and enclosing markup tags, like CSS `text-decoration`, and `layout.decorations` reports where each one goes.
  - Lines (`LineDecoration`, built with `underline()`, `overline()` and `lineThrough()`) are part of the text's shape: the run's layers paint them, so outlines wrap the text and the line together, and a line takes each run's colors. They can be solid, double, dotted, dashed or wavy. In vertical text an underline goes on the right (傍線) by default.
  - Boxes (`BoxDecoration`, built with `marker()` and `frame()`) are markers (蛍光ペン), highlights and frames: each covers a chosen part of the em box (`inset`), with `padding`, `radius`, `skew`, a fill and a border, behind the glyphs or in front of them.
- `skew` on plates, which slants them into parallelograms.

- More gradients: `conicGradient()` for conic (angle) gradients, `diamondGradient()` for Photoshop's diamond gradient, and `reflect: true` on linear gradients for its reflected gradient, which runs the stops from the middle out to both ends. They paint layers and plates like the other gradients, with the same scopes.

- Font checks: `checkFonts()` loads the fonts a caption needs, then reports each `FontIssue`: a family that is neither declared nor installed (`family-not-found`), a weight or style with no face (`face-unavailable`), a face that failed to load (`load-failed`), and characters no font in the stack has (`missing-glyphs`). Stacks with a generic family accept the fallback, so their characters aren't checked. `<Text>` and `createCanvasText()` run the check and log new issues with `console.warn`; `fontCheck: "error"` reports them as a `FontIssueError` instead (in Remotion, failing the render), and `fontCheck: "off"` skips it. `<Text>` also takes `onFontIssues`. The check embeds the Adobe Blank 2 font (SIL Open Font License), adding about 2 KB.

- `tsume` style (文字ツメ): removes a fraction (`0`–`1`) of the blank space on both sides of each kana, kanji and fullwidth character, measured from the glyph's ink, like 文字ツメ in Photoshop and Premiere Pro. It works in vertical text too.
- `punctuationTrim` option (約物の半角取り): trims the blank half of fullwidth opening brackets at the start of a line (`"start"`), of closing brackets, 、 and 。 at the end of a line (`"end"`), or both. With `"end"`, closing punctuation that fits once trimmed stays on its line.
- `align: "justify-all"` (均等配置): justifies every line, including the last one, single-line text and lines ended by `\n`, so a word can be spread across a fixed width (字取り). Without `maxWidth`, lines spread to the longest one.
- `wrap: "balance"`, which makes the lines of each paragraph about equally long, and `wrap: "pretty"`, which avoids a last line with a single word, phrase or character (泣き別れ). The new `TextWrap` type names every `wrap` mode.
- `<Text>` in `tellu/react` and `tellu/remotion` is now accessible: it renders the caption's text in a visually hidden element for screen readers and find-in-page, and hides the canvas from assistive technology. The new `alt` prop replaces that text, and `alt=""` marks a caption as decorative.
- `autospace` option (和欧間アキ): adds space between kana or kanji and Latin letters or digits, a quarter em with `true` or any `Length`.
- Layer `shading` and the helpers `innerShadow()`, `innerGlow()`, `bevel()` and `satin()`, for the inner shadow, inner glow, bevel and satin layer styles of Photoshop. A shaded layer paints the inside of its shape with a strength computed from the distance to the shape's edge: shifted and faded from the edge (`type: "inset"`), lit as a smooth or chiseled bevel from a light direction (`type: "bevel"`, whose `bevel()` helper returns a highlight layer and a shadow layer), or in silky bands (`type: "satin"`). With `stroke`, outlines can be shaded too. Shading is computed per glyph, so the shaded outlines of overlapping neighbours show a seam, and shaded layers always render round joins.

### Changed

- Every public export now has editor documentation (JSDoc): what each function, component, type and option does, its unit and default, what to pass, and short examples for the main entry points.
- The first render of glyphs with round outlines, `"inside"` or `"center"` strokes, or shading is faster: outlined captions rasterize in about half the time, and shaded ones in about 15% less. Their output is pixel-identical.

### Fixed

- Punctuation hanging past `maxWidth` (ぶら下げ) at the end of the text or before a `\n` no longer adds an empty line after it.
- Wide round outlines (the default join) no longer leave holes inside small counters, such as the loop of す. Round strokes are now grown from a distance field of the glyph's visible shape instead of Chrome's `strokeText`, which makes the first render of each glyph slightly slower. As a result, `"center"` and `"inside"` strokes follow the visible outline and no longer trace contours that overlap inside the glyph. Miter and bevel joins still use `strokeText`.

## [0.0.2] - 2026-10-09

The first public release.

### Added

- Layered caption styles: any number of layers, each the glyph grown by `stroke` px and painted with `paint`, with its own `strokePosition`, `join`, `offset`, `blur`, `opacity`, `blendMode` and PixiJS `filters`. Layers are composited per slot, so the outlines of neighbouring glyphs merge.
- Layer helpers `fill()`, `stroke()`, `shadow()` and `glow()`.
- Paints: solid colors, `linearGradient()`, `radialGradient()` and image patterns, stretched per glyph, per line or over the whole block (`scope`).
- Rich text: runs that override the style or patch single layers by index or `id`, and `parseMarkup()` to build runs from `<tag>` markup.
- Typography: letter spacing, kerning, line height, baseline shift, and condensed or expanded glyphs (長体 / 平体, `scaleX` / `scaleY`) whose outlines keep an even width.
- Line breaking: automatic wrapping with Japanese kinsoku rules, hanging punctuation and optional phrase breaking (`lineBreak: "phrase"`), plus `align` (including `"justify"`) and `maxLines`.
- Fitting: `overflow: "shrink"` scales the font to fit, and `overflow: "squeeze"` compresses overflowing lines, both bounded by `minScale`. Text that doesn't fit `maxLines` even at `minScale` is truncated after `maxLines`.
- Vertical writing (縦書き): `writingMode: "vertical-rl"` and `"vertical-lr"`, `textOrientation`, and 縦中横 with `textCombineUpright`.
- Background plates (座布団) with `background`, drawn behind the whole block or behind each line.
- Per-glyph animation with `glyphTransform` (position, scale, rotation, skew, opacity, visibility), which moves cached sprites instead of re-rasterizing.
- Glyph bitmaps cached and shared by every node, keeping up to 64 MB of recently hidden ones so the next caption in the same style reuses them.
- `TextNode.revision`, which changes only when what the node paints changes, so redundant draws can be skipped. `<Text>` uses it to draw a static caption once instead of on every render.
- Rendering entry points: `TextNode` for PixiJS scenes, `TextRenderer` (one shared offscreen WebGL renderer), `createCanvasText()` for a plain canvas, and `layoutText()` with a pluggable `Measurer` for layout without rendering.
- Font loading: `loadFonts()` loads only the font faces and `unicode-range` subsets a text uses, with `fontsReady()` to check whether they are loaded and `subscribeFontEpoch()` to react when fonts finish loading.
- `tellu/react`: `<Text>`, `TextRendererProvider` and `useTextRenderer()`.
- `tellu/remotion`: `<Text>`, which holds each frame with `delayRender` until the renderer, the fonts and the drawing are ready.

[Unreleased]: https://github.com/kazuito/tellu/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/kazuito/tellu/releases/tag/v0.0.2
