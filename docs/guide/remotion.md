---
description: Render tellu captions in Remotion videos with <Text> from tellu/remotion, covering which --gl backend gives WebGL on macOS and Linux, fonts with stylesheets, @remotion/google-fonts and @remotion/fonts, delayRender and timeouts, sequences, transparent output, scale and determinism.
---

# Remotion

`tellu/remotion` exports `<Text>`, which holds Remotion's frame capture until the caption is fully drawn. That covers the caption's own work: the renderer, the font subsets it needs and the draw. Two things are your job: Chrome must have WebGL, and your fonts must be declared before the caption mounts. Both fail silently when they go wrong, so most of this page is about them.

::: info Verified with
Remotion 4.0.534 and tellu 0.0.4 with PixiJS 8.22.0, using the headless Chrome 157.0.8080.0 that Remotion downloads. We tested on macOS 27 (arm64, Apple M2) and in a Linux arm64 Docker container (Debian bookworm, no GPU). Remotion Lambda, Cloud Run, x86-64 Linux hosts, Windows and machines with a Linux GPU weren't tested.
:::

## Setup

**1. Install**

```sh
bun add tellu pixi.js
```

**2. Choose a GL backend that gives Chrome WebGL.** PixiJS composes captions with WebGL. The right `--gl` value depends on the machine. See [the next section](#webgl-and-the-gl-option) for the full results:

```ts
// remotion.config.ts
import { Config } from "@remotion/cli/config";

Config.setChromiumOpenGlRenderer("angle"); // macOS with a GPU; use "swangle" on Linux without a GPU
```

On the command line, pass `--gl=angle` or `--gl=swangle`. With `renderMedia()`, `renderStill()`, `selectComposition()` and `openBrowser()` from `@remotion/renderer`, pass `chromiumOptions: { gl: "angle" }`.

**3. Declare your fonts before captions mount.** See [Fonts](#fonts).

## WebGL and the `--gl` option

Without WebGL, PixiJS falls back to its Canvas 2D renderer. **Nothing fails, and nothing is logged by tellu.** Captions still draw, but:

- blurred layers lose their blur: a `glow()` becomes a hard outline, and a `shadow()` loses its softness;
- layer `opacity` is ignored;
- layer `blendMode` is ignored.

Fills, gradients, strokes, bevels and other shading are rasterized before composition, so they look the same either way.

A still of the same caption with each `--gl` value (`remotion still --gl=<value>`, with no `remotion.config.ts`):

| `--gl` | macOS arm64 (M2) | Linux arm64 container, no GPU |
| --- | --- | --- |
| *(not set)* | WebGL through SwiftShader. Correct. Chrome logs `Automatic fallback to software WebGL has been deprecated` | WebGL through SwiftShader. Correct |
| `angle` | WebGL on the GPU (ANGLE Metal). Correct | **No WebGL**: Canvas 2D fallback, glow missing |
| `swangle` | WebGL through SwiftShader. Correct | WebGL through SwiftShader. Correct |
| `swiftshader` | **No WebGL**: Canvas 2D fallback | **No WebGL**: Canvas 2D fallback |
| `egl` | **No WebGL**: Canvas 2D fallback | **No WebGL**: Canvas 2D fallback |
| `vulkan` | **No WebGL**: Canvas 2D fallback | **No WebGL**: Canvas 2D fallback |
| `angle-egl` | not tested | **No WebGL**: Canvas 2D fallback |

So:

- **On a Mac**, `angle` uses the GPU.
- **On Linux without a GPU** (CI runners, servers, Docker), use `swangle`. **`angle` gave no WebGL there**, so a config that works on a Mac silently loses glows and shadows in CI.
- Leaving `--gl` unset gave WebGL on both machines, through a software fallback that Chrome says is deprecated. Don't rely on it.
- To check what a machine gives you, draw `(await TextRenderer.shared()).renderer.name` into a test composition. It is `"webgl"` or `"canvas"`.

## A caption

```tsx
import { AbsoluteFill } from "remotion";
import { fill, linearGradient, shadow, stroke } from "tellu";
import { Text } from "tellu/remotion";

const variety = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 120,
  layers: [
    shadow({ offset: [10, 12], blur: 8, stroke: 30 }),
    stroke(30, "#14206b"),
    stroke(16, "#ffffff"),
    fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"])),
  ],
};

export const Scene = () => (
  <AbsoluteFill>
    <Text
      text="今日もいい天気ですね！"
      textStyle={variety}
      maxWidth={1600}
      align="center"
      anchor="bottom"
      style={{ position: "absolute", left: 960, top: 980 }}
    />
  </AbsoluteFill>
);
```

Define styles at module level. They're plain objects, so put them in a `styles.ts` and share them across compositions.

## Positioning

`<Text>` renders a `<div>` the size of the **layout box**: the text's width (or `maxWidth`) by its line heights. Outlines, shadows, plates and transformed glyphs paint *outside* that box without affecting it, just as `box-shadow` doesn't affect CSS layout.

`anchor` chooses which point of the box sits at the element's position. It is applied as a CSS `translate`:

| `anchor` | Point |
| --- | --- |
| `"top-left"` (default) | Top-left corner |
| `"top"`, `"bottom"`, `"left"`, `"right"` | Edge midpoints |
| `"center"` | Centre |
| `"top-right"`, `"bottom-left"`, `"bottom-right"` | Corners |
| `[x, y]` | Fractions of the box, e.g. `[0.5, 1]` = `"bottom"` |

So `anchor="bottom"` with `left: 960, top: 980` means "centred horizontally on 960, sitting on the line y = 980". Use it for subtitles that grow upward when they wrap.

`style` and `className` go to the wrapper `<div>`, so CSS transforms, opacity, `clip-path` and flex layout all work on the caption as a whole. Don't put the caption inside an ancestor with `overflow: hidden` that is only as big as the layout box, or its outlines get clipped.

## Animation

Read the frame and pass a `glyphTransform`:

```tsx
import { useCurrentFrame } from "remotion";

export const PopIn = () => {
  const frame = useCurrentFrame();
  return (
    <Text
      text="一文字ずつ登場"
      textStyle={variety}
      glyphTransform={(glyph) => {
        const t = Math.min(1, Math.max(0, (frame - glyph.visibleIndex * 2) / 6));
        return t === 0 ? { visible: false } : { scale: 1.6 - 0.6 * t, opacity: t };
      }}
    />
  );
};
```

A new `glyphTransform` (or `clip`) alone doesn't rebuild the caption: it only moves the existing glyphs. Other prop changes do rebuild it. Measured per update for a 96 px caption with a glow, a stroke and a fill (`createCanvasText`, inside a Remotion render):

| Change per frame | macOS, `angle` (GPU) | macOS, `swangle` | Linux container, `swangle` |
| --- | --- | --- | --- |
| `glyphTransform` only | 0.36 ms | 0.29 ms | 0.20 ms |
| `text` (e.g. a counter), glyphs already rasterized | 1.85 ms | 7.80 ms | 7.29 ms |
| `fontSize` (every glyph re-rasterized) | 34.5 ms | 72.8 ms | 49.5 ms |

A counter that changes `text` every frame is fine. Animating sizes, styles or layout props every frame costs tens of milliseconds per caption per frame. See [Glyph transforms](./animation) for recipes and [Performance](./performance) for the rules.

## Fonts

tellu loads the faces and `unicode-range` subsets a caption needs, but only faces that already exist in `document.fonts`. What matters in Remotion is **when** they appear there. Three ways to load fonts, and how each behaved:

### A stylesheet (`<link>`)

Hold the render until the stylesheet has loaded, then mount the captions. The `FontGate` component on the [Fonts](./fonts#remotion) page does this, and the [example project](https://github.com/kazuito/tellu/tree/main/examples/remotion) uses it. With Google Fonts, each caption downloads only the subsets its characters need.

What happens when the stylesheet itself fails:

- **Unreachable host:** the gate's `delayRender` times out and the render fails: `A delayRender() "Loading font stylesheet" was called but not cleared after 28000ms`.
- **An error response (a 404, or a Google Fonts URL with a bad family):** `onerror` fires, the gate opens, and the caption draws in a fallback font. See [Catching wrong fonts](#catching-wrong-fonts).

### `@remotion/google-fonts`

```tsx
import { loadFont } from "@remotion/google-fonts/NotoSansJP";

const { fontFamily, waitUntilDone } = loadFont("normal", { weights: ["900"] });
```

Things to know, from its 4.0.534 source and from running it:

- **It downloads every subset of every requested weight up front.** `subsets: ["japanese"]` doesn't help, because it expands to all the numbered chunks. For Noto Sans JP at one weight, that was **124 requests**, and Remotion logs a warning about it. A stylesheet loads only the subsets your captions use.
- **It adds `FontFace` objects, not `@font-face` rules.** tellu works with them, and the font check counts them as declared.
- **Each face is added to `document.fonts` only after it has downloaded, already loaded.** A `<Text>` that mounts before then measures with a fallback font, and **doesn't redraw when the face is added**: adding a loaded face fires no font-loading event for `<Text>` to react to. We confirmed this with a face added 1.5 s after mount: the captured frame kept the fallback font. (A stylesheet that loads late is different: `<Text>` re-measured once its fonts loaded.) Without a gate, captions rendered correctly in our runs, but only because the downloads finished first.

Gate on `waitUntilDone()`:

```tsx
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

export const Scene = () => {
  const [handle] = useState(() => delayRender("google fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    waitUntilDone().then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return ready ? <Text text="ゴシック体テロップ" textStyle={{ fontFamily, fontWeight: 900 }} /> : null;
};
```

### `@remotion/fonts` (local files)

```ts
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const loaded = loadFont({ family: "Dela Gothic One", url: staticFile("DelaGothicOne-Regular.ttf") });
```

This also adds a `FontFace`, so the same rule applies: mount captions after `loaded` resolves (the same gate, awaiting `loaded`). Match the weight. A file that only has weight 400, used with `fontWeight: 900`, is reported as `face-unavailable`: `has no normal face of weight 900, so the browser uses the nearest face and may synthesize bold`.

### Catching wrong fonts

Set `fontCheck="error"` on `<Text>` for renders. In every failure above that left a fallback font on screen (a 404 stylesheet, a `FontFace` added too late, a wrong weight), it **failed the render** with a `FontIssueError` naming the family, instead of shipping the wrong font.

With the default `fontCheck="warn"`, `remotion render` printed the warning once per browser tab: `tellu: the font family "…" is not declared by any @font-face rule and is not installed, so a fallback font is used instead`. **`remotion still` printed nothing**, so don't rely on warnings for stills.

```tsx
import { getRemotionEnvironment } from "remotion";

<Text text="速報" textStyle={style} fontCheck={getRemotionEnvironment().isRendering ? "error" : "warn"} />;
```

## How frames are held

`<Text>` calls `delayRender()` when it mounts, and calls `continueRender()` once:

1. the shared WebGL renderer is ready,
2. every font face and subset the caption needs is loaded,
3. the current props are drawn.

If later props need fonts that aren't loaded yet, it calls `delayRender()` again. Errors (a failed renderer, a font issue in `"error"` mode, a draw error) go to `cancelRender()`. `delayRenderLabel` sets the label shown when Remotion times out.

From Remotion's source (4.0.534):

- A `delayRender()` handle times out after the render timeout (`--timeout`, 30 000 ms by default) **minus 2 000 ms**. That's why the message above says `28000ms`. Raise `--timeout` if fonts load slowly.
- Timeouts only apply while rendering. In Studio and `@remotion/player`, a `delayRender()` handle never times out, so fonts that never load don't fail anything there. How the Player's own buffering reacts to these handles wasn't tested.
- `cancelRender()` always throws. In a render, that fails the render. In Studio or the Player, the error is thrown in the page.

## Sequences and premounting

`<Text>` inside `<Sequence premountFor={…}>` worked. A render across the cut showed the new sequence's first frame with its caption in the correct animation state.

## Output

### Transparent video

Leave the composition's background empty, then:

```sh
# PNG still with alpha
remotion still src/index.ts Caption out/caption.png

# ProRes 4444 with alpha
remotion render src/index.ts Caption out/caption.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png

# VP9 WebM with alpha
remotion render src/index.ts Caption out/caption.webm --codec=vp9 --pixel-format=yuva420p --image-format=png
```

All three kept the caption's alpha. Edge pixels keep their color as alpha falls (a pink glow stays pink down to alpha 1), so captions composite without dark fringes.

### Resolution and `--scale`

`<Text>` rasterizes at `devicePixelRatio` unless you set `resolution`. Remotion's `--scale=2` sets `devicePixelRatio` to 2, so captions are rasterized at 2×, not upscaled. A 1920×1080 composition rendered as a sharp 3840×2160 frame.

If you scale a caption up with CSS instead (a `transform: scale(2)` on a parent), raise its `resolution` to match.

### Determinism and concurrency

60 frames of a composition whose caption text changes every frame, rendered as PNGs with `--concurrency=1` and `--concurrency=4`, were byte-identical. Keep animations deterministic: derive everything from `useCurrentFrame()`, and use seeded randomness (`order: "random"` with a `seed`, or your own hash) instead of `Math.random()`.

## Tips

- **One WebGL context for everything.** Every `<Text>` draws through one shared offscreen renderer, unless you pass your own `renderer`.
- **Studio looks right, the render doesn't.** Check the [`--gl` table](#webgl-and-the-gl-option) for the machine you render on, then [the fonts](#fonts).
- **Vertical video.** Nothing changes. Position with `anchor` and lay out with `maxWidth` against your composition size.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Glows are hard outlines, shadows are sharp, layer opacity is ignored | No WebGL, so PixiJS fell back to Canvas 2D. Use `--gl=swangle` on Linux without a GPU, `angle` on macOS |
| Wrong font, render succeeds | The font wasn't in `document.fonts` when the caption first drew. Gate the captions. `fontCheck="error"` turns this into a failure |
| `A delayRender() "…" was called but not cleared after 28000ms` | A font stylesheet or file never loaded. Check the URL and network, or raise `--timeout` |
| `FontIssueError: … has no normal face of weight 900` | The loaded font doesn't have that weight. Load it, or change `fontWeight` |
| `Made 124 network requests to load fonts for Noto Sans JP` | `@remotion/google-fonts` loading every subset. Expected. A stylesheet loads fewer |

See the [`tellu/remotion` reference](/api/remotion) for every prop.
