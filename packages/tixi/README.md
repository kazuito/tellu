# tixi

Telop (caption) rendering for the web, built on [PixiJS](https://pixijs.com). Made for [Remotion](https://remotion.dev) and anything else that needs captions CSS can't draw:

- Unlimited outline layers, each with its own width, paint, offset, blur, opacity, blend mode and PixiJS filters
- Shadows and glows as ordinary layers (they can be outlined too)
- Solid colors, linear / radial gradients and image patterns, stretched per glyph, per line or over the whole block
- Rich text: change font, size, color or any layer for part of the text (runs or `<tag>` markup)
- Automatic line wrapping with Japanese kinsoku (禁則処理), hanging punctuation (ぶら下げ) and optional phrase breaking (文節改行)
- Letter spacing, condensed / expanded glyphs (長体 / 平体) with uniform outlines, kerning, baseline shift, line height
- Fit to width by shrinking the font or squeezing the line (長体で収める)
- Background plates (座布団)
- Per-glyph transforms for animation (position, scale, rotation, skew, opacity)

```sh
bun add tixi pixi.js
```

## Usage

### React / Remotion

```tsx
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tixi";
import { Telop } from "tixi/remotion"; // or "tixi/react" outside Remotion

const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 96,
  layers: [
    // bottom → top
    shadow({ offset: [8, 10], blur: 6, stroke: 22 }),
    stroke(22, "#1b2a7a"),
    stroke(12, "#ffffff"),
    fill(linearGradient(["#fff7a8", "#ffcf3d", "#ff8a00"], { scope: "line" })),
  ],
};

export const Caption = () => {
  const frame = useCurrentFrame();
  return (
    <Telop
      text={parseMarkup("今日は<em>最高</em>の日", { em: { fontSize: 120, layers: { 3: { paint: "#ff3d8b" } } } })}
      textStyle={style}
      maxWidth={1600}
      align="center"
      anchor="bottom"
      style={{ position: "absolute", left: 960, top: 980 }}
      glyphTransform={(glyph) => ({ y: Math.max(0, 40 - (frame - glyph.visibleIndex * 2) * 8) })}
    />
  );
};
```

`<Telop>` renders a block the size of the layout box; outlines, shadows and transformed glyphs may paint outside of it. `anchor` picks which point of the box sits at the element's position.

`tixi/remotion` holds the frame with `delayRender` until the renderer is ready, the fonts are loaded and the frame is drawn. Render with ANGLE so headless Chrome has WebGL:

```ts
// remotion.config.ts
Config.setChromiumOpenGlRenderer("angle");
```

tixi loads exactly the font faces and `unicode-range` subsets each telop's text needs, but it can only see `@font-face` rules that are already declared. Mount telops after your font stylesheet has loaded — e.g. a gate component that renders its children once the `<link>` fires `onload` and only then releases its own `delayRender` (see [`examples/remotion/src/fonts.tsx`](../../examples/remotion/src/fonts.tsx)). Telops also re-measure whenever the document finishes loading fonts later.

### Vanilla

```ts
import { createCanvasTelop, fill, stroke } from "tixi";

const telop = await createCanvasTelop(canvas, {
  text: "こんにちは",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(10, "#000"), fill("#fff")] },
});
telop.update({ text: "さようなら" }); // redraws synchronously
```

The canvas is resized to the telop's ink bounds; `telop.lastDraw.x / y` is its offset from the layout box.

### Inside a PixiJS scene

```ts
import { loadFonts, TelopNode } from "tixi";

await loadFonts(props);
const node = new TelopNode(props, { resolution: app.renderer.resolution });
app.stage.addChild(node);
node.update({ glyphTransform: (glyph) => ({ rotation: Math.sin(t + glyph.index) * 10 }) });
```

`node.layout` exposes lines and glyph positions; `node.getInkBounds()` returns everything it paints.

## Concepts

### Layers

Every layer is the glyph shape grown by `stroke` px and painted with `paint`:

| Option | Default | |
| --- | --- | --- |
| `paint` | | color, `linearGradient()`, `radialGradient()` or `{ type: "pattern", source }` |
| `stroke` | `0` | `0` paints the glyph itself |
| `strokePosition` | `"outside"` | `"inside"` / `"center"` draw a band along the outline |
| `join` / `miterLimit` | `"round"` / `10` | |
| `offset` | `[0, 0]` | |
| `blur` / `blurQuality` | `0` / `4` | PixiJS `BlurFilter` strength / quality |
| `opacity` | `1` | applied to the merged layer, so overlapping outlines don't darken |
| `blendMode` | `"normal"` | blend against the layers below |
| `filters` | | extra PixiJS filters |
| `id` | | target for run patches |

Layers are composited per slot: the outlines of all glyphs are drawn before any fill, so neighbouring outlines merge the way telop software does.

Helpers: `fill(paint)`, `stroke(width, paint)`, `shadow({ color, offset, blur, stroke })`, `glow({ color, stroke, blur })`.

### Paint scope

Gradients and patterns are stretched over `scope`: `"glyph"` (each character), `"line"` (default for gradients) or `"block"`. Linear gradient angles follow CSS (`180` = top → bottom).

### Rich text

`text` takes runs: `["今日は", { text: "最高", style: { fontSize: 120 } }, "の日"]`. A run's `layers` is either an array (replaces all layers) or a patch by index / `id`: `{ layers: { 2: { paint: "red" }, edge: { stroke: 20 } } }`.

`parseMarkup(markup, tags)` builds runs from `<tag>` markup. Tags nest, `<br/>` breaks the line, `&lt;` `&gt;` `&amp;` escape. Tag names are passed to `glyphTransform` as `glyph.tags`.

### Style

| Option | Default | |
| --- | --- | --- |
| `fontFamily` | `"sans-serif"` | string or list |
| `fontSize` | `64` | |
| `fontWeight` / `fontStyle` | `"normal"` | |
| `letterSpacing` | `0` | px or `{ em }` |
| `scaleX` / `scaleY` | `1` | 長体 / 平体; outlines stay uniform |
| `lineHeight` | `1.2` | multiplier or `{ px }` |
| `kerning` | `true` | |
| `baselineShift` | `0` | px or `{ em }`, raises the run |
| `layers` | white fill | |

### Layout

| Option | Default | |
| --- | --- | --- |
| `maxWidth` | | layout box width; enables wrapping |
| `wrap` | `"auto"` | `"none"` keeps explicit lines only |
| `align` | `"left"` | `"center"`, `"right"`, `"justify"` |
| `lineBreak` | `"char"` | `"phrase"` keeps Japanese phrases together (heuristic, `Intl.Segmenter`) |
| `kinsoku` | `true` | `false` or custom `{ lineStart, lineEnd, inseparable, hanging }` |
| `overflow` | `"visible"` | `"shrink"` scales the font to fit `maxWidth` / `maxLines`; `"squeeze"` compresses overflowing lines |
| `minScale` | `0.3` | lower bound for `shrink` / `squeeze` |
| `maxLines` | | truncates (or bounds `shrink`) |
| `background` | | plate: `{ paint, padding, radius, stroke, mode: "block" \| "line", offset, blur, opacity }` |
| `glyphTransform` | | `(glyph) => ({ x, y, scale, scaleX, scaleY, rotation, skewX, skewY, opacity, visible, origin })`; angles in degrees |

`layoutTelop(options, measurer?)` runs the layout without rendering; pass your own `Measurer` to lay out outside the browser.

## How it works

1. **Layout** — pure TypeScript: grapheme segmentation, kinsoku-aware line breaking, kerning-aware positions from Canvas 2D measurements.
2. **Rasterize** — each glyph × layer is drawn once with Canvas 2D (native `strokeText` for uniform scale, a distance field for 長体 / 平体 so outline width stays even) and cached as a texture.
3. **Compose** — PixiJS sprites grouped per layer slot, merged with `max` blending, then blurred / filtered / faded as a whole. Glyph transforms only move sprites, so animation doesn't re-rasterize.

`TelopRenderer` keeps one offscreen WebGL context for any number of telops and copies each into its own canvas synchronously.

## Limitations

- Horizontal text only (vertical writing is planned).
- Glyphs are drawn one at a time, so ligatures (e.g. `fi`) are not formed.
- Where outlines of different colors in the same slot overlap, the brighter one wins.

## Development

This package lives in the [tixi monorepo](../../README.md). Workspace consumers resolve `tixi` to `src/` through the `tixi-source` export condition, so examples run without a build.
