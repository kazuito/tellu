# tellu × Remotion

| Composition | Shows |
| --- | --- |
| `Variety` | Multi-layer outlines and gradients, per-glyph spring pop-in, a shaking punchline, a shrink-to-fit title plate, a glowing note |
| `Subtitles` | Data-driven subtitles with speaker tags and a karaoke wipe (two stacked `<Text>`s, the colored one revealed with `clip-path`) |
| `LowerThird` | News-style name plate with a gradient background, staggered reveal and a long title shrunk to fit |
| `Showcase` | All of the above in sequence |

Run `bun run studio` at the repo root to open Remotion Studio while tellu rebuilds on change. The commands below use the built `tellu`, so run `bun run build` at the root first.

```sh
bun run dev      # Remotion Studio, without rebuilding tellu
bun run render   # out/showcase.mp4
bun run stills              # out/stills/*.png
bun run stills --baseline   # out/stills-baseline/*.png, the reference for --diff
bun run stills --diff       # render, then compare against the baseline (diffs in out/stills-diff)
```

Notes:

- `remotion.config.ts` sets `Config.setChromiumOpenGlRenderer("angle")` (PixiJS needs WebGL in headless Chrome).
- `src/fonts.tsx` gates the compositions until the Google Fonts stylesheet has declared its `@font-face` rules; each `<Text>` then loads only the subsets its text uses.
