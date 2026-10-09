# tellu monorepo

| Path | |
| --- | --- |
| [`packages/tellu`](packages/tellu) | The library: telop rendering on PixiJS ([README](packages/tellu/README.md)) |
| [`examples/remotion`](examples/remotion) | Remotion project using `tellu/remotion`: variety-show captions, karaoke subtitles, a lower third |
| [`examples/playground`](examples/playground) | Browser playground for every feature, plus `TextNode` inside a PixiJS app |
| [`docs`](docs) | Documentation site ([kazuito.github.io/tellu](https://kazuito.github.io/tellu/)): VitePress with live examples, `llms.txt` and Markdown for every page |

## Commands

```sh
bun install
bun run test       # library unit tests
bun run typecheck  # every workspace
bun run build      # packages/tellu/dist
bun run dev        # playground at http://localhost:3100
bun run studio     # Remotion Studio at http://localhost:3200
bun run docs:dev   # docs at http://localhost:3400/
```

Render the Remotion sample:

```sh
cd examples/remotion
bun run render     # out/showcase.mp4
bun run stills     # representative frames in out/stills
```

Examples import `tellu` from the workspace. They enable the `tellu-source` export condition (`bun --conditions`, webpack `resolve.conditionNames`, TypeScript `customConditions`) so they use the library's TypeScript source directly; the published package resolves to `dist/`.
