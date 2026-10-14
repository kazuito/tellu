---
description: Overview of tellu's three entry points (tellu, tellu/react and tellu/remotion) and an index of every export.
---

# API reference

tellu ships three entry points:

```ts
import { createCanvasText, fill, stroke, TextNode } from "tellu"; // core, framework-free
import { Text } from "tellu/react"; // React component
import { Text } from "tellu/remotion"; // React component wired to Remotion's delayRender
```

`pixi.js` v8 is a peer dependency of all three. `react` is needed for `tellu/react`, and both `react` and `remotion` for `tellu/remotion`.

## `tellu`

| Export | |
| --- | --- |
| **Rendering** | |
| [`createCanvasText()`](./rendering#createcanvastext) | Draw a caption into a canvas |
| [`TextNode`](./rendering#textnode) | A caption as a PixiJS container |
| [`TextRenderer`](./rendering#textrenderer) | Shared offscreen renderer that draws nodes into 2D canvases |
| [`createGlyphContexts()`](./rendering#createglyphcontexts) | The `GlyphContext` list for a layout |
| **Style helpers** | |
| [`fill()`](./helpers#fill) · [`stroke()`](./helpers#stroke) · [`shadow()`](./helpers#shadow) · [`glow()`](./helpers#glow) | Layer shorthands |
| [`linearGradient()`](./helpers#lineargradient) · [`radialGradient()`](./helpers#radialgradient) | Gradient paints |
| [`parseMarkup()`](./helpers#parsemarkup) | `<tag>` markup to runs |
| [`applyOverride()`](./helpers#applyoverride) · [`mergeOverrides()`](./helpers#mergeoverrides) | Style override utilities |
| [`defaultStyle`](./helpers#defaultstyle) · [`defaultKinsoku`](./helpers#defaultkinsoku) · [`resolveStyle()`](./helpers#resolvestyle) | Defaults |
| **Animation** | |
| [`animateText()`](./animation#animatetext) · [`unitProgress()`](./animation#unitprogress) · [`combineGlyphTransforms()`](./animation#combineglyphtransforms) | Build glyph animations |
| [`fadeIn()`](./animation#fadein) · [`typewriter()`](./animation#typewriter) · [`popIn()`](./animation#popin) · [`slideIn()`](./animation#slidein) · [`dropIn()`](./animation#dropin) · [`wave()`](./animation#wave) · [`shake()`](./animation#shake) | Presets |
| **Layout & fonts** | |
| [`layoutText()`](./layout#layouttext) · [`normalizeRuns()`](./layout#normalizeruns) | Lay out text without rendering |
| [`loadFonts()`](./layout#loadfonts) · [`fontsReady()`](./layout#fontsready) · [`fontRequests()`](./layout#fontrequests) | Font loading |
| [`getFontEpoch()`](./layout#getfontepoch) · [`subscribeFontEpoch()`](./layout#subscribefontepoch) | Font load notifications |
| [`CanvasMeasurer`](./layout#canvasmeasurer) · [`getDefaultMeasurer()`](./layout#getdefaultmeasurer) | Text measurement |
| [`fontSpecOf()`](./layout#fontspecof) · [`fontToCss()`](./layout#fonttocss) | Font descriptors |
| **Types** | [Props, styles, layers, paints, glyphs…](./types) |

## `tellu/react`

| Export | |
| --- | --- |
| [`Text`](./react#text) | Draws a caption into its own canvas |
| [`TextRendererProvider`](./react#textrendererprovider) · [`useTextRenderer()`](./react#usetextrenderer) | Choose the renderer for a subtree |

## `tellu/remotion`

| Export | |
| --- | --- |
| [`Text`](./remotion#text) | `<Text>` that holds frames with `delayRender` until drawn |

The rest of `tellu/react`'s exports are re-exported from `tellu/remotion` for convenience.

<llm-only>

## Rules for code generation

- In Remotion projects, import `Text` from `tellu/remotion`, not `tellu/react`. Only the Remotion one holds frame capture with `delayRender`.
- `<Text>` takes the caption style as `textStyle`. Its `style` prop is the wrapper element's CSS.
- Remotion renders need `Config.setChromiumOpenGlRenderer("angle")` (or `--gl=angle`), because PixiJS needs WebGL.
- Font stylesheets must be loaded before `<Text>` mounts or `createCanvasText()` runs. tellu can only load faces from `@font-face` rules that already exist, and falls back silently otherwise.
- `style.layers` is ordered bottom → top. Outlines must get narrower toward the top, and the fill is usually last.
- Animate with `glyphTransform`. Create PixiJS filters and pattern images once, outside render functions, because they are compared by identity.

</llm-only>
