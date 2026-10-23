# tellu × HyperFrames

A 24-second night-walk vlog opener, `Tokyo Night Walk`, built with [HyperFrames](https://hyperframes.heygen.com). The scenes are plain HTML and CSS animated with GSAP. tellu draws every caption into a `<canvas>`. The [HyperFrames guide](https://tellujs.vercel.app/guide/hyperframes) explains the pattern and what was verified.

| Sub-composition | Shows |
| --- | --- |
| `opening` | Vertical neon title with a double outline that flickers on glyph by glyph |
| `chapter` | Outlined, extruded chapter number sliding in glyph by glyph |
| `monologue` | Karaoke subtitles: a dim copy under a lit copy revealed by `wipeClip()` |
| `neon` | Neon sign with `warp`, glow and bevel and a broken tube |
| `outro` | Outlined title whose entrance is combined with a wave (`combineGlyphTransforms`) |

Run `bun run hyperframes` at the repo root to open HyperFrames Studio at http://localhost:3300. It rebuilds tellu and the caption bundle on change. The commands below use the built `tellu`, so run `bun run build` at the root first. The `hyperframes` CLI needs Node.js 22+, and rendering needs FFmpeg.

```sh
bun run dev      # Studio, without rebuilding tellu
bun run check    # hyperframes lint + runtime, layout and motion checks
bun run render   # out/tokyo-night-walk.mp4
```

How it fits together:

- `index.html` mounts one sub-composition per scene from `compositions/`. It also loads the fonts, GSAP and `bundle/main.js`, the bundle of `src/` made by `bun build`. The bundle lives in `bundle/` because Studio's file watcher ignores `build/` and `dist/`.
- Each scene calls `telluCaptions.attach(id, timeline, duration)`. That creates the scene's captions (`src/scenes.ts`) in its `.host` elements, waits for their fonts, and adds a tween that redraws them whenever the timeline is seeked. The scene registers its timeline only once `attach` resolves. Registered earlier, the renderer can capture frames before the captions exist.
- Caption animations use tellu's frame-based presets at 30 fps. Everything is deterministic (seeded noise, no `Math.random()`), because frames are rendered by several workers out of order.
