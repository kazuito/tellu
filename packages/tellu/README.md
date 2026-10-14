# tellu

Telop (caption) rendering for the web, built on [PixiJS](https://pixijs.com). Made for [Remotion](https://remotion.dev) and anything else that needs captions CSS can't draw:

- Unlimited outline layers, each with its own width, paint, offset, blur, opacity, blend mode and PixiJS filters
- Shadows and glows as ordinary layers (they can be outlined too)
- Solid colors, linear (or reflected) / radial / conic / diamond gradients and image patterns, stretched per glyph, per line or over the whole block
- Rich text: change font, size, color or any layer for part of the text (runs or `<tag>` markup)
- Horizontal and vertical writing (縦書き) with upright / sideways glyphs, vertical punctuation and 縦中横
- Text on a path (arched titles, captions along any SVG path) and warps (arc, bulge, flag, fisheye, … or a free-form envelope) with even outlines
- Automatic line wrapping with Japanese kinsoku (禁則処理), hanging punctuation (ぶら下げ) and optional phrase breaking (文節改行)
- Letter spacing, condensed / expanded glyphs (長体 / 平体) with uniform outlines, kerning, baseline shift, line height
- Fit to width by shrinking the font or squeezing the line (長体で収める)
- Background plates (座布団), straight or slanted, behind the block or each line
- Underlines (outlined with the text), markers, highlights and frames along runs of text, following line breaks and vertical writing
- Per-glyph transforms for animation (position, scale, rotation, skew, opacity)

```sh
bun add tellu pixi.js
```

**[Documentation](https://tellujs.vercel.app/)**: guides, live examples and the API reference ([`llms.txt`](https://tellujs.vercel.app/llms.txt) for AI assistants).

## Usage

### React / Remotion

```tsx
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tellu";
import { Text } from "tellu/remotion"; // or "tellu/react" outside Remotion

const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 96,
  layers: [
    // bottom → top
    shadow({ offset: [8, 10], blur: 6, stroke: 22 }),
    stroke(22, "#1b2a7a"),
    stroke(12, "#ffffff"),
    fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"], { scope: "line" })),
  ],
};

export const Caption = () => {
  const frame = useCurrentFrame();
  return (
    <Text
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

`<Text>` renders a block the size of the layout box; outlines, shadows and transformed glyphs may paint outside of it. `anchor` picks which point of the box sits at the element's position.

`tellu/remotion` holds the frame with `delayRender` until the renderer is ready, the fonts are loaded and the frame is drawn. Render with ANGLE so headless Chrome has WebGL:

```ts
// remotion.config.ts
Config.setChromiumOpenGlRenderer("angle");
```

tellu loads exactly the font faces and `unicode-range` subsets each text needs, but it can only see `@font-face` rules that are already declared. Mount `<Text>` after your font stylesheet has loaded — e.g. a gate component that renders its children once the `<link>` fires `onload` and only then releases its own `delayRender` (see [`examples/remotion/src/fonts.tsx`](https://github.com/kazuito/tellu/blob/main/examples/remotion/src/fonts.tsx)). `<Text>` also re-measures whenever the document finishes loading fonts later.

### Vanilla

```ts
import { createCanvasText, fill, stroke } from "tellu";

const canvasText = await createCanvasText(canvas, {
  text: "こんにちは",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(10, "#000"), fill("#fff")] },
});
canvasText.update({ text: "さようなら" }); // redraws synchronously
```

The canvas is resized to the text's ink bounds; `canvasText.lastDraw.x / y` is its offset from the layout box.

### Inside a PixiJS scene

```ts
import { loadFonts, TextNode } from "tellu";

await loadFonts(props);
const node = new TextNode(props, { resolution: app.renderer.resolution });
app.stage.addChild(node);
node.update({ glyphTransform: (glyph) => ({ rotation: Math.sin(t + glyph.index) * 10 }) });
```

`node.layout` exposes lines and glyph positions; `node.getInkBounds()` returns everything it paints.

## Concepts

### Layers

Every layer is the glyph shape grown by `stroke` px and painted with `paint`:

| Option | Default | |
| --- | --- | --- |
| `paint` | | color, `linearGradient()`, `radialGradient()`, `conicGradient()`, `diamondGradient()` or `{ type: "pattern", source }` |
| `stroke` | `0` | `0` paints the glyph itself |
| `strokePosition` | `"outside"` | `"inside"` / `"center"` draw a band along the outline |
| `join` / `miterLimit` | `"round"` / `10` | |
| `shading` | | inner shadow, inner glow, bevel or satin, painted inside the shape |
| `offset` | `[0, 0]` | |
| `blur` / `blurQuality` | `0` / `4` | PixiJS `BlurFilter` strength / quality |
| `opacity` | `1` | applied to the merged layer, so overlapping outlines don't darken |
| `blendMode` | `"normal"` | blend against the layers below |
| `filters` | | extra PixiJS filters |
| `id` | | target for run patches |

Layers are composited per slot: the outlines of all glyphs are drawn before any fill, so neighbouring outlines merge the way telop software does.

Helpers: `fill(paint)`, `stroke(width, paint)`, `shadow({ color, offset, blur, stroke })`, `glow({ color, stroke, blur })`, and for shading `innerShadow()`, `innerGlow()`, `bevel()` (two layers, highlight and shadow) and `satin()`.

### Paint scope

Gradients and patterns are stretched over `scope`: `"glyph"` (each character), `"line"` (default for gradients) or `"block"`. Linear gradient angles follow CSS (`180` = top → bottom).

### Rich text

`text` takes runs: `["今日は", { text: "最高", style: { fontSize: 120 } }, "の日"]`. A run's `layers` is either an array (replaces all layers) or a patch by index / `id`: `{ layers: { 2: { paint: "red" }, edge: { stroke: 20 } } }`.

`parseMarkup(markup, tags)` builds runs from `<tag>` markup. Tags nest, `<br/>` breaks the line, `&lt;` `&gt;` `&amp;` escape. Tag names are passed to `glyphTransform` as `glyph.tags`.

### Style

| Option | Default | |
| --- | --- | --- |
| `fontFamily` | `"sans-serif"` | string or list |
| `fontSize` | `64` | px; a run can also give `{ em }` of the base size |
| `fontWeight` / `fontStyle` | `"normal"` | |
| `letterSpacing` | `0` | px or `{ em }` |
| `scaleX` / `scaleY` | `1` | 長体 / 平体; outlines stay uniform |
| `lineHeight` | `1.2` | multiplier or `{ px }` |
| `kerning` | `true` | |
| `baselineShift` | `0` | px or `{ em }`, raises the run (moves it right in vertical text) |
| `textOrientation` | `"mixed"` | vertical text: `"upright"` / `"sideways"` for every glyph |
| `textCombineUpright` | `"digits 2"` | vertical text: 縦中横 for runs of up to N digits (`"digits 3"`, …), `"all"` or `"none"` |
| `layers` | white fill | |

### Layout

| Option | Default | |
| --- | --- | --- |
| `writingMode` | `"horizontal-tb"` | `"vertical-rl"` (縦書き, lines right → left) or `"vertical-lr"` |
| `maxWidth` | | layout box width; the line length (enables wrapping) in horizontal text |
| `maxHeight` | | layout box height; the line length (enables wrapping) in vertical text |
| `wrap` | `"auto"` | `"none"` keeps explicit lines only |
| `align` | `"start"` | `"center"`, `"end"`, `"justify"`; `"left"` / `"top"` = start, `"right"` / `"bottom"` = end |
| `lineBreak` | `"char"` | `"phrase"` keeps Japanese phrases together (heuristic, `Intl.Segmenter`) |
| `kinsoku` | `true` | `false` or custom `{ lineStart, lineEnd, inseparable, hanging }` |
| `overflow` | `"visible"` | `"shrink"` scales the font to fit `maxWidth` / `maxHeight` / `maxLines`; `"squeeze"` compresses overflowing lines |
| `minScale` | `0.3` | lower bound for `shrink` / `squeeze` |
| `maxLines` | | truncates (or bounds `shrink`) |
| `background` | | plate: `{ paint, padding, radius, stroke, mode: "block" \| "line", offset, blur, opacity }` |
| `glyphTransform` | | `(glyph) => ({ x, y, scale, scaleX, scaleY, rotation, skewX, skewY, opacity, visible, origin })`; angles in degrees |

`layoutText(options, measurer?)` runs the layout without rendering; pass your own `Measurer` to lay out outside the browser.

### Vertical writing (縦書き)

```tsx
<Text
  text={parseMarkup("第12話\n消えた<tcy>!?</tcy>ラーメンの謎", { tcy: { textCombineUpright: "all" } })}
  writingMode="vertical-rl"
  maxHeight={800}
  align="center"
  textStyle={style}
/>
```

Everything else works the same way: layers, rich text, kinsoku, `shrink` / `squeeze`, plates and glyph transforms. Options follow CSS (`writing-mode`, `text-orientation`, `text-combine-upright`):

- **Lines** are stacked right → left (`vertical-rl`) or left → right (`vertical-lr`). `maxHeight` is the line length, `maxWidth` bounds `shrink`, and `align` runs along the column.
- **Glyphs**: with `textOrientation: "mixed"` CJK stays upright and latin text is turned 90°. Brackets, `ー`, `〜` and `…` are turned too, `、。` move to the top right and small kana move up and right, approximating the fonts' vertical forms (Canvas 2D cannot use the `vert` feature).
- **縦中横**: up to two consecutive digits are set horizontally in one cell by default (`"第12話"`). Use `textCombineUpright: "all"` on a run (e.g. a markup tag) for anything else, such as `!?` or `100%`; text wider than 1em is condensed.
- **Geometry** stays physical: `scaleX` / `scaleY`, gradient angles, plate `padding` (`[x, y]`, defaulting to 12 across and 24 along a vertical line) and `glyphTransform` offsets all use screen axes. `layout.lines` reports logical `inlineStart` / `inlineSize` / `blockStart` / `blockSize` plus a physical `contentBox`.

## How it works

1. **Layout** — pure TypeScript: grapheme segmentation, kinsoku-aware line breaking, kerning-aware positions from Canvas 2D measurements.
2. **Rasterize** — each glyph × layer is drawn once with Canvas 2D (outlines grown from a distance field, so they stay even on 長体 / 平体 and fill small counters cleanly) and cached as a texture.
3. **Compose** — PixiJS sprites grouped per layer slot, merged with `max` blending, then blurred / filtered / faded as a whole. Glyph transforms only move sprites, so animation doesn't re-rasterize.

`TextRenderer` keeps one offscreen WebGL context for any number of `TextNode`s and copies each into its own canvas synchronously.

## Limitations

- Vertical forms are approximated by rotating and moving the horizontal glyphs, so fonts with distinctive vertical alternates (e.g. `〜`, which is also mirrored in vertical fonts) differ slightly from CSS. Ruby (furigana) is not supported yet.
- Glyphs are drawn one at a time, so ligatures (e.g. `fi`) are not formed.
- Where outlines of different colors in the same slot overlap, the brighter one wins.

## Third-party

Font checks embed [Adobe Blank 2](https://github.com/adobe-fonts/adobe-blank-2), © 2013, 2015 Adobe Systems Incorporated, under the SIL Open Font License 1.1 ([`licenses/AdobeBlank2-OFL.txt`](https://github.com/kazuito/tellu/blob/main/packages/tellu/licenses/AdobeBlank2-OFL.txt)).

## Development

The [repository](https://github.com/kazuito/tellu) is a Bun workspace: the library in `packages/tellu`, a Remotion sample in `examples/remotion`, a browser playground in `examples/playground` and the docs site in `docs`.

```sh
bun install
bun run test       # library unit tests
bun run typecheck  # every workspace
bun run build      # packages/tellu/dist
bun run dev        # playground at http://localhost:3100
bun run studio     # Remotion Studio at http://localhost:3200
bun run docs:dev   # docs at http://localhost:3400/
```

The examples and docs use the built `dist/` through the workspace link, like any other consumer. `dev`, `studio` and `docs:dev` rebuild it on change.
