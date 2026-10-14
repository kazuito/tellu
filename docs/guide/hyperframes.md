---
description: Render tellu captions in HyperFrames HTML video compositions, covering loading tellu with or without a bundler, driving draws from the GSAP timeline, registering the timeline only after fonts load, sub-compositions, Studio, transparent output, Docker and what fails how.
---

# HyperFrames

[HyperFrames](https://hyperframes.heygen.com) renders videos from plain HTML. A composition registers a paused GSAP timeline, and the renderer seeks that timeline to each frame and captures the page. tellu fits in as a canvas that you redraw whenever the timeline is seeked.

There is no tellu component for HyperFrames. You use [`createCanvasText()`](./canvas) and wire it to the timeline yourself, as on this page. [`examples/hyperframes`](https://github.com/kazuito/tellu/tree/main/examples/hyperframes) in the repository is a complete 24-second project built this way.

::: info Verified with
HyperFrames 0.8.156 and tellu 0.0.4 with PixiJS 8.22.0, on macOS 27 (arm64, Apple M2) and with `--docker` (Linux arm64). The render browser was headless Chrome 152 on macOS and Chrome 149 in Docker. Results on other versions, on x86-64 Linux, on Windows, and with HyperFrames' cloud rendering weren't tested.
:::

## The pattern

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@900&display=block" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <!-- Your bundle of tellu and pixi.js, exposing window.tellu (see below) -->
    <script src="bundle/tellu.js"></script>
    <style>
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #223; }
      #root { position: relative; width: 100%; height: 100%; }
      .clip { position: absolute; inset: 0; }
      #c { position: absolute; left: 200px; top: 400px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="2" data-width="1920" data-height="1080">
      <section id="scene" class="clip" data-start="0" data-duration="2" data-track-index="0">
        <canvas id="c"></canvas>
      </section>
    </div>
    <script>
      const { createCanvasText, fill, glow, stroke, typewriter } = window.tellu;
      const tl = gsap.timeline({ paused: true });
      window.__timelines = window.__timelines || {};
      (async () => {
        const canvas = document.getElementById("c");
        const caption = await createCanvasText(canvas, {
          text: "一文字ずつ表示されるテロップ",
          style: {
            fontFamily: "Noto Sans JP",
            fontWeight: 900,
            fontSize: 100,
            layers: [glow({ color: "#ff3d8b", stroke: 8, blur: 16 }), stroke(10, "#000"), fill("#fff")],
          },
        });
        const reveal = typewriter({ stagger: 3 });
        const draw = (time) => {
          const r = caption.update({ glyphTransform: reveal(time * 30) });
          Object.assign(canvas.style, {
            width: `${r.width}px`,
            height: `${r.height}px`,
            marginLeft: `${r.x}px`,
            marginTop: `${r.y}px`,
          });
        };
        const playhead = { get time() { return 0; }, set time(v) { draw(v); } };
        tl.to(playhead, { time: 2, duration: 2, ease: "none" }, 0);
        draw(0);
        window.__timelines.main = tl;
        window.__hfForceTimelineRebind?.();
      })();
    </script>
  </body>
</html>
```

Four things make this work:

1. **The captions are created first, and the timeline is registered afterwards.** `createCanvasText()` resolves once the WebGL renderer exists, the font subsets the text needs are loaded and the first frame is drawn. Only then is the timeline put on `window.__timelines`. See [Registering the timeline](#registering-the-timeline) for what happens otherwise.
2. **A tween on the timeline redraws the caption.** Its target is a plain object, and every seek sets `time`, which redraws. The tween spans the whole composition, so every frame is covered.
3. **Time is converted to frames.** HyperFrames gives seconds. tellu's [animation presets](./animation) count their delays and durations in frames at 30 fps, hence `time * 30`. Use your composition's frame rate if it isn't 30.
4. **The canvas is moved to the ink bounds.** `update()` resizes the canvas to what the caption paints, including outlines and glows that reach outside the layout box. `r.x` and `r.y` are that region's offset from the layout box (see [Canvas](./canvas#the-canvas-is-resized)), so offsetting the canvas by them keeps the text itself in place.

Changing only `glyphTransform` or `clip` per frame is cheap. Changing `text` per frame works too (the example's ticking clock does it), but each change re-lays out the text. See [Performance](./performance).

## Loading tellu into a composition

A composition is an HTML page, and tellu is an npm package whose code imports `pixi.js`. You need either a bundle or an import map.

### A bundle (recommended)

Bundle tellu and PixiJS into one classic script that puts what you need on `window`:

```ts
// lab/global.ts
import * as tellu from "tellu";
(window as unknown as { tellu: typeof tellu }).tellu = tellu;
```

```sh
bun build lab/global.ts --outfile bundle/tellu.js --format iife
```

The bundle was about 1.3 MB unminified. Load it with a plain `<script src>` in `<head>`, after the font stylesheet's `<link>`. A classic script waits for the stylesheets before it, and the inline script at the end of `<body>` runs after the bundle, so `window.tellu` is defined by then.

The example project instead bundles its own code (caption definitions included) and exposes one function, `telluCaptions.attach()`, which every scene calls.

A `<script type="module">` that imports an ESM bundle worked as well. So did a module in `<head>` that sets `window.tellu` for a classic script at the end of `<body>`, in one render. In a plain browser, the classic script would run before that deferred module, so this depends on how HyperFrames runs scripts. It wasn't checked in Studio. Don't rely on it.

### No bundler: an import map

```html
<script type="importmap">
  {
    "imports": {
      "pixi.js": "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs",
      "tellu": "https://cdn.jsdelivr.net/npm/tellu@0.0.4/dist/index.js"
    }
  }
</script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
```

```html
<script type="module">
  import * as tellu from "tellu";
  // …the same code as in the pattern above, using tellu.createCanvasText etc.
</script>
```

This renders correctly. It maps `pixi.js` to PixiJS's single-file ESM build and `tellu` to its published `dist/index.js`. Pin both versions.

::: danger esm.sh and jsDelivr `+esm` don't work
`import * as tellu from "https://esm.sh/tellu@0.0.4"` (and the same with `https://cdn.jsdelivr.net/npm/tellu@0.0.4/+esm`) imports fine, but the first draw throws inside PixiJS:

```
TypeError: Cannot read properties of undefined (reading 'push')
    at R.collectRenderablesWithEffects (https://esm.sh/pixi.js@8.22.0/es2022/lib/scene/container/container-mixins/collectRenderablesMixin.mjs:2:597)
```

`createCanvasText()` rejects, so the timeline is never registered. In the render, that ended like a hang: it waited 45 s, warned `sub_timeline_readiness_timeout`, rendered every frame blank and exited with code 0. Map `pixi.js` to `dist/pixi.min.mjs` as above instead.
:::

## Registering the timeline

HyperFrames polls `window.__timelines[<composition id>]` and starts capturing once it is there. tellu's setup is asynchronous: it creates the WebGL renderer and loads fonts. What we observed:

| Setup | Result |
| --- | --- |
| Timeline registered after `await createCanvasText(...)` | Correct. With 3 s of extra setup delay, the renderer waited for it (setup took 4.6 s) |
| Timeline registered synchronously, captions added a moment later | Correct when the setup was fast, but only because the setup finished before capture began |
| Timeline registered synchronously, setup delayed by 3 s | **Every frame blank.** The render didn't wait and finished in 5 s |
| Setup throws before registering: an `Error`, or a [font check](./fonts#checking-fonts) `FontIssueError`, in a classic or a module script | **Render fails** after the 45 s wait, exit code 1: `sub_timeline_script_failure: A composition script threw and a timeline did not register within 45000ms (still unregistered: main) (runtime-error:FontIssueError: …)` |
| Setup never settles (`await new Promise(() => {})`) | **Blank frames, exit code 0** after the 45 s wait, with only the warning `sub_timeline_readiness_timeout` |
| tellu loaded from esm.sh (see above) | Same as the line before: blank frames, exit code 0, `sub_timeline_readiness_timeout`. In a browser the setup rejected with the `TypeError` shown above, yet the render didn't report it as a script failure. We didn't find out why |

So:

- Register at the end of the async setup, and call `window.__hfForceTimelineRebind?.()` right after. HyperFrames' own blocks do this, and every successful run here did it too. Whether it is needed in each case wasn't isolated.
- **Don't count on a broken setup failing the render.** It did when the setup threw, but a setup that never registers can also end in blank frames and exit code 0. Treat `sub_timeline_readiness_timeout` in the render output as an error.
- `hyperframes render --help` lists `--player-ready-timeout=<ms>` (default `45000`) for this wait. We didn't test changing it.

### `onUpdate` or a setter

HyperFrames' documentation warns that seeking a GSAP timeline doesn't fire callbacks and recommends a property setter, as in the pattern above. In 0.8.156 an `onUpdate` tween also redrew correctly. That held in renders, in sub-compositions and when seeking in Studio:

```js
const playhead = { time: 0 };
tl.to(playhead, { time: 2, duration: 2, ease: "none", onUpdate: () => draw(playhead.time) }, 0);
```

The setter doesn't depend on callbacks at all, so it is the safer choice.

## Fonts

The rule from [Fonts](./fonts) applies: tellu can only load faces that an `@font-face` rule already declares.

- Put the stylesheet `<link>` in `<head>` before the bundle's classic `<script>`. The browser doesn't run the classic script until the stylesheet has loaded, so the rules exist when your code starts.
- `createCanvasText()` then loads exactly the subsets the caption's characters need. A caption whose text came from `--variables` loaded the subsets of its new characters with no extra code.
- If a caption's text changes over time, load the fonts for every character it will show before the first draw (`loadFonts({ text: "0123456789:", style })`), because `update()` is synchronous and won't wait.
- Pass `{ fontCheck: "error" }` to `createCanvasText()` to fail the render when a family isn't declared, rather than render a fallback font. It rejects, and the render fails as `sub_timeline_script_failure` (table above).
- The fonts are fetched from the network at render time. That worked both locally and in `--docker`.

## Sub-compositions

HyperFrames recommends splitting scenes into sub-compositions (`data-composition-src`), and its linter warns (`nested_structure_needs_subcomposition`, `timeline_track_too_dense`) when one file holds several scenes. The example has one file per scene in `compositions/`. Each scene registers its own timeline in local time, starting at 0.

What we found about how sub-compositions run, in both `render` and Studio:

- **Each instance runs in its own document.** In a sub-composition's script, `window !== window.top`, and the document contains only that instance (one canvas, composition roots `cap-a` and `cap`). The same file mounted twice, with different `data-variable-values`, drew both instances correctly, each with its own variables. Element ids can't collide between instances.
- **The root page's `<head>` scripts are available in each one.** `window.tellu` and `gsap` from `index.html`'s `<head>` were defined inside every sub-composition. Since each instance has its own `window`, each one gets its own tellu renderer (its own WebGL context) and loads its own fonts.
- **20 instances at once rendered**, with no lost WebGL contexts. 19 captions were in frame and drawn correctly. The 20th was placed below the frame, and only its debug text was visible.
- **`document.currentScript` is not inside the composition.** It exists, but its parent is `<body>`, so `currentScript.closest("[data-composition-id]")` is `null`. Look elements up in the document instead (`document.getElementById`, `querySelector`). That is safe because each instance has its own document.
- `window.__hyperframes.getVariables()` returns each instance's own values.

## Studio

`hyperframes preview` shows tellu captions in the player and in the composition thumbnails, and seeking redraws them.

The preview reloads when project files change, but its file watcher skips any path containing one of these directory names (`WATCHER_EXCLUDED_DIRS` in HyperFrames 0.8.156): `.cache`, `.git`, `.hyperframes`, `.next`, `.thumbnails`, `.transcode-cache`, `.vite`, `.waveform-cache`, `build`, `coverage`, `dist`, `node_modules`, `outputs` and `renders`. **Don't write your bundle to `build/` or `dist/`.** It still loads, but Studio won't reload when it changes. The example writes to `bundle/`.

`hyperframes preview` detaches into the background when its output isn't a terminal, for example under `bun run --parallel`. Pass `--foreground` to keep it attached.

## Rendering

| Option | Result with tellu |
| --- | --- |
| Default (macOS) | WebGL on the GPU (`hardware gpu`). Correct |
| `--no-browser-gpu` | Software WebGL (SwiftShader). Correct, glows included. Capture took 7.0 s instead of 2.8 s for 60 frames |
| `--docker` | Linux, software WebGL. Correct. See below |
| `--resolution 4k` on a 1920×1080 composition | Output 3840×2160 with `devicePixelRatio` 2, and tellu rasterizes at 2×, so captions are sharp, not upscaled |
| `-w 1` vs `-w 4` | The 60 PNG frames were byte-identical |
| `--variables '{"title":"…"}'` | Caption text read from `getVariables()` changed accordingly |
| `hyperframes snapshot --at 0.5,1.5` | Captures the captions |

Everything a caption draws must be deterministic, because frames are rendered by several workers out of order. Derive every value from the time (or frame) you're given. For randomness, use seeded noise (`order: "random"` with a `seed`, or your own hash), never `Math.random()`.

### Transparent video

Give `html` and `body` a transparent background, then:

| `--format` | Result |
| --- | --- |
| `png-sequence` | RGBA PNGs. Edge pixels keep their color as alpha falls (straight alpha), so glows don't get dark fringes |
| `mov` | ProRes 4444 (`yuva444p12le`) with the same alpha |
| `webm` | VP9 with alpha in `--docker`. Locally it **failed**: `Encoding failed: FFmpeg exited with code 8 … Error splitting the argument list: Option not found`, because the local FFmpeg build had no libvpx |

### Docker

`--docker` built its image on the first run (126 s in total for a 2 s composition) and rendered with software WebGL in Chrome 149.

The 24-second example rendered correctly in Docker, but slowly: 12 min 29 s of capture. On a Docker VM with 7.9 GB of memory, HyperFrames switched to its low-memory profile (one worker, screenshot capture). An earlier identical run failed at frame 539 of 720 with `Protocol error (Runtime.callFunctionOn): Target closed`. We didn't find the cause, and the failure didn't happen again. Give Docker more memory for long compositions.

## `lint` and `check`

`hyperframes lint` and `hyperframes check` passed on the example with 0 errors and 0 warnings. Note what they can't see:

- **Canvas text isn't audited.** The contrast check reported `0/0 text checks`. It and the layout checks only see DOM text, so a caption that overflows the frame or has poor contrast isn't flagged.
- The linter finds `window.__timelines` registration by reading your HTML. Keep the registration line in the composition's inline script. Registering only from inside the bundle made `lint` report `missing_timeline_registry`, even though the render worked.
- The layout check flagged decorative elements that deliberately extend past the frame (`container_overflow`). `data-layout-allow-overflow` on the element silences it.

## Troubleshooting

**Every frame is blank and the log says `sub_timeline_readiness_timeout`.** The timeline was never registered, usually because the setup threw or hung. Open the composition in a browser and read the console. If you load tellu from esm.sh, see [the import map](#no-bundler-an-import-map).

**The first frames are blank, later ones are fine.** The timeline was registered before the captions were created. Register it at the end of the async setup.

**A caption shows in a fallback font.** The stylesheet wasn't loaded before `createCanvasText()` ran, or the family or weight isn't in it. Use `fontCheck: "error"` to make this fail loudly.

**Edits to the bundle don't show in Studio.** It's in a directory the watcher skips. See [Studio](#studio).

**A caption is drawn but in the wrong place.** Offset the canvas by `lastDraw.x` and `lastDraw.y` after every draw (see [Canvas](./canvas)). Moving glyphs change the ink bounds from frame to frame.
