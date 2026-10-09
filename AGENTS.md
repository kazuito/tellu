# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Repository

Bun workspaces monorepo for `tellu`, a telop (caption) rendering library on PixiJS v8, built mainly for Remotion.

- `packages/tellu`: the library. It has three entries: `tellu` (core), `tellu/react` and `tellu/remotion`.
- `examples/remotion`: Remotion sample project. Each real-world scene (`Variety`, `Subtitles`, `LowerThird`, `News`, `Quiz`, `Recipe`, `Sale`, `GameStream`, `Cinema`, `Documentary`, `Credits`) is its own composition and `Showcase` plays them in sequence; `Shorts` is a separate vertical (1080×1920) composition.
- `examples/playground`: browser demo of every feature, served by Bun's HTML dev server.
- `docs`: the documentation site (VitePress, English only), deployed on Vercel. See [Documentation](#documentation).

## Commands

Run these from the repo root:

```sh
bun run test        # library unit tests (bun test in packages/tellu)
bun run typecheck   # tsc --noEmit in every workspace
bun run build       # tsdown -> packages/tellu/dist (also rewrites `exports` in its package.json)
bun run dev         # playground at http://localhost:3100
bun run studio      # Remotion Studio at http://localhost:3200
bun run docs:dev    # docs site at http://localhost:3400/
bun run docs:check  # docs examples typecheck + every public export documented + examples formatted
bun run docs:format # format the docs' example code (Biome, 80 columns)
bun run docs:build  # docs/.vitepress/dist, including llms.txt and a .md per page
bun run lint        # biome check (lint + format + import order)
bun run lint:fix    # biome check --write
```

- Git hooks (lefthook, installed by `bun install` via `prepare`): pre-commit runs Biome with fixes on staged files and the typecheck; pre-push runs `biome ci`, the typecheck and the tests. Config is in `lefthook.yml`, and `lefthook-local.yml` is for personal overrides.

- Single test file: `cd packages/tellu && bun test test/layout.test.ts`.
- Single test by name: add `-t "<name>"`.
- Render the Remotion sample: `cd examples/remotion && bun run render` (writes `out/showcase.mp4`).
- Representative stills: `bun run stills` (writes `out/stills/*.png`); `bun run stills News Quiz` limits it to those compositions. Inspecting stills is the practical way to check rendering changes visually.

TypeScript is v7 (native). tsdown warns that its API is experimental; that warning is expected.

## Workspace resolution (`tellu-source` condition)

tsdown uses `exports.devExports: "tellu-source"`. Each export in `packages/tellu/package.json` therefore maps `tellu-source` to `src/*.ts` and `default` to `dist/*.js`.

- **Don't hand-edit that `exports` field.** `bun run build` regenerates it.
- The examples enable the condition, so they use library source without a build:
  - Bun: `bun --conditions=tellu-source` (but Bun's HTML dev server, used by the playground, ignores the condition for the browser bundle and serves `dist/`: run `bun run build` after library changes, then restart `bun run dev`)
  - Webpack: `resolve.conditionNames` in `remotion.config.ts`
  - TypeScript: `customConditions` in each example's tsconfig
- If a workspace link goes missing (`Cannot find module 'tellu'`), delete every `node_modules` and run `bun install` again.

## Architecture (packages/tellu/src)

The pipeline has three stages: **layout (pure) → rasterize (Canvas 2D) → compose (PixiJS)**.

1. **Layout** (`layout/`) is pure TypeScript with an injected `Measurer`. Tests use `test/fakeMeasurer.ts`: CJK = 1em, ASCII = 0.5em, space = 0.25em, and no canvas.
   - `segment.ts`: grapheme clusters, then break opportunities. Breaks are `BREAK_PREFERRED` or `BREAK_FALLBACK`; the fallback level marks breaks inside a phrase in `lineBreak: "phrase"` mode. Kinsoku rules can block a break.
   - `layout.ts`: greedy line breaking, alignment and justify. `overflow: "shrink"` binary-searches a `fontScale`; `"squeeze"` compresses each line.
   - `layout.ts` works in logical axes (inline = along the line, block = across lines) and only maps to physical x/y when placing glyphs, so horizontal and vertical writing share line breaking, alignment, shrink and squeeze. `maxWidth` / `maxHeight` are physical; whichever runs along the line is the line length.
   - `vertical.ts` (vertical writing only): merges 縦中横 clusters (`textCombineUpright`) before line breaking and classifies each cluster as `upright`, `sideways` (rotated 90°: latin, brackets, ー), `combined` or `shifted` (、。 mirrored through the em box center by their ink, small kana moved by a fixed offset; both checked against Chrome's CSS vertical text with Noto Sans JP). Columns are centered on the em box from `ideographicBaseline`.
   - Kerning comes from measuring growing prefixes of a run. It is stored separately from each cluster's own advance: `kern[k]` shifts glyph k and is dropped at line starts. Folding kerning into the advance was a real bug (「 after 。 got hidden behind the next glyph). In vertical text only neighbouring sideways glyphs kern.
2. **Style model** (`style/`): every decoration is a `Layer` (the glyph grown by `stroke` px and painted with `paint`), stacked bottom → top.
   - A rich-text run's `layers` is either an array (replaces all layers) or a patch keyed by index or `id`. Patches are resolved in `merge.ts`.
3. **Render** (`render/`, `TextNode.ts`):
   - Each glyph × layer is rasterized once into its own canvas texture (`rasterize.ts`), cached in `TextureCache`. The cache key includes the sub-pixel offset, the rotation, the layer shape, the paint, and the paint's scope box relative to the glyph.
   - Sideways glyphs are rotated inside their texture (rotate, then scale on screen), so paint, outlines and `glyphTransform` stay in screen space.
   - When scaleX equals scaleY, strokes use native `strokeText`. When they differ (長体/平体), strokes are grown from a supersampled signed distance field (`sdf.ts`) so outline width stays uniform.
   - `planGroups` groups sprites by **layer slot** (index) plus an effects signature (offset, blur, opacity, blend mode, filters). Groups render in slot order, so all outlines sit below all fills.
   - Inside a group, sprites use `blendMode: "max"`. Every group container always gets an `AlphaFilter` to isolate it, so overlapping semi-transparent outlines don't compound.
   - `TextNode.refresh()` compares a `stableKey` of the props minus `glyphTransform`. Only when that key changes does it rebuild. Otherwise it just reapplies glyph transforms to existing sprites, which keeps per-frame animation cheap.
   - `stableKey` hashes plain data structurally and class instances (filters, images) by identity.
4. **Output**: `TextRenderer` is one shared offscreen WebGL renderer (`preserveDrawingBuffer: true`).
   - `draw()` renders a node synchronously, then `drawImage`s the result into the target 2D canvas, sized to the node's ink bounds.
   - The renderer only grows, in power-of-two steps. Frequent resizes make PixiJS log "destroyed while still bound" warnings.
   - `BlurFilter` strength is in local (CSS) px, not device px: never multiply it by `resolution`. Pixi's own padding (`2 × strength`) is too small for multi-pass blurs and crops shadows, so `TextNode` sets `padding` from `blurReach` (`render/blur.ts`).

**React/Remotion** (`react/Text.tsx`, `remotion/Text.tsx`):
- `<Text>` keeps a `TextNode` in a ref and draws in `useLayoutEffect` on every render. It sizes the wrapper div to the layout box and offsets the canvas to the ink bounds.
- It reports `onPendingChange` while the renderer or fonts aren't ready, and also while `document.fonts.status === "loading"`.
- It subscribes to `document.fonts` `loadingdone` (`subscribeFontEpoch`) and re-measures when fonts finish loading.
- The Remotion wrapper maps pending to `delayRender`/`continueRender`.

## Documentation

**Every change to the public API (anything exported from `tellu`, `tellu/react` or `tellu/remotion`, or any prop, option, default or behavior) must update the docs in the same change.** Then run `bun run docs:check`; it must pass.

**Every user-facing change to the library must also add an entry to `packages/tellu/CHANGELOG.md`** under `## [Unreleased]`, in the matching [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) section (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`). Write for library users, not as a commit log, and mark breaking changes with **Breaking:**. Docs-only and example-only changes don't need an entry. On release, rename `[Unreleased]` to `[x.y.z] - YYYY-MM-DD`, start a new empty `[Unreleased]`, and update the compare links at the bottom.

- Where things go:
  - `docs/guide/*.md`: concepts and how-tos, with live examples.
  - `docs/api/*.md`: the reference. Every export needs a heading with its name in backticks (`check-api.ts` enforces this); options tables list types and defaults.
  - `docs/examples/*.md`: real-world recipes.
  - `README.md` files: keep them short and in sync with the guide's claims.
  - When adding a page, add it to the sidebar in `docs/.vitepress/config.ts` and give it a frontmatter `description` (it becomes the page's line in `llms.txt`).
- Live examples are fences with the info string `ts demo`. The fence code runs in the browser and is type-checked against the library source by `bun run typecheck` (`docs/scripts/check-snippets.ts`, errors reported at the Markdown line).
  - The default export is `TextNodeProps`, or `(frame: number) => TextNodeProps` for animation (30 fps).
  - `ts demo compare` exports a `Record<label, TextNodeProps>`, drawn side by side.
  - Attributes: `backdrop=checker|night|street|studio|light` (default `checker`; use another only when a caption is hard to read on it), `loop=<frames>`, `still=<frame shown when paused>`.
  - Run `bun run docs:format` after editing examples; the code column is narrow, so they are formatted at 80 columns.
  - Keep examples self-contained (imports included) and use fonts from the stylesheet in `docs/.vitepress/theme/demo/runtime.ts`, adding any new family there.
- Removed or renamed API: search `docs/` for the old name, including prose and non-demo code blocks, which are not type-checked.
- Content for agents only goes in `<llm-only>` blocks (and human-only in `<llm-exclude>`), handled by `vitepress-plugin-llms`.
- Writing style: plain, direct English. Show a rendering before explaining it, and state defaults explicitly.
- Check rendering changes visually with `bun run docs:dev`; every demo is live.

## Constraints and gotchas

- Fonts: tellu can only load `unicode-range` subsets for `@font-face` rules that are already declared. If text draws before the stylesheet loads, it falls back silently. Apps must gate `<Text>` on the stylesheet; see `FontGate` in `examples/remotion/src/fonts.tsx`, whose `continueRender` runs in an effect after the children mount.
- Remotion needs `Config.setChromiumOpenGlRenderer("angle")` because PixiJS needs WebGL in headless Chrome.
- Known limitations: vertical forms are approximated (Canvas 2D can't apply the `vert` feature), no ruby, no ligatures (glyphs are drawn individually), and overlapping outlines of different colors in the same slot combine per channel with `max`.
- Pixi, Remotion and React are peer deps that tsdown keeps external. Code under `layout/`, `style/` and `markup.ts` must stay free of Pixi/DOM runtime imports so `bun test` can run it.
