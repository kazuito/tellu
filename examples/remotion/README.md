# tellu × Remotion

| Composition | Shows |
| --- | --- |
| `Variety` | Multi-layer outlines and gradients, per-glyph spring pop-in, a shaking punchline, a glowing note |
| `Subtitles` | Data-driven subtitles colored by speaker, with a karaoke wipe (two stacked `<Text>`s, the colored one revealed with `clip`) |
| `Quiz` | Outlined question on a plate, choices squeezed to fit, a countdown and a slammed-in answer |
| `Recipe` | Bouncy rounded title and a step whose key words get a marker layer |
| `Sale` | TV-shopping price in a heavy gradient with double outlines, slammed in with a spring |
| `GameStream` | Rainbow reaction caption with a brush font, shaking per glyph |
| `Documentary` | Vertical title (縦書き) with outlines and a gradient, revealed down the column |
| `Showcase` | All of the above in sequence |
| `Shorts` | Vertical (1080×1920) word-by-word captions |

Run `bun run studio` at the repo root to open Remotion Studio while tellu rebuilds on change. The commands below use the built `tellu`, so run `bun run build` at the root first.

```sh
bun run dev      # Remotion Studio, without rebuilding tellu
bun run render   # out/showcase.mp4
bun run stills              # out/stills/*.png
bun run stills --baseline   # out/stills-baseline/*.png, the reference for --diff
bun run stills --diff       # render, then compare against the baseline (diffs in out/stills-diff)
```

Notes:

- `remotion.config.ts` sets `Config.setChromiumOpenGlRenderer("angle")` (PixiJS needs WebGL in headless Chrome). That gives WebGL on macOS; on Linux without a GPU, `angle` gave no WebGL in our tests and `swangle` did (see the [Remotion guide](https://tellujs.vercel.app/guide/remotion#webgl-and-the-gl-option)).
- `src/fonts.tsx` gates the compositions until the Google Fonts stylesheet has declared its `@font-face` rules; each `<Text>` then loads only the subsets its text uses.
