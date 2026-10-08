# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Repository

Bun workspaces monorepo for `tixi`, a telop (caption) rendering library on PixiJS v8, built mainly for Remotion.

- `packages/tixi`: the library. It has three entries: `tixi` (core), `tixi/react` and `tixi/remotion`.
- `examples/remotion`: Remotion sample project. Each real-world scene (`Variety`, `Subtitles`, `LowerThird`, `News`, `Quiz`, `Recipe`, `Sale`, `GameStream`, `Cinema`, `Credits`) is its own composition and `Showcase` plays them in sequence; `Shorts` is a separate vertical (1080×1920) composition.
- `examples/playground`: browser demo of every feature, served by Bun's HTML dev server.

## Commands

Run these from the repo root:

```sh
bun run test        # library unit tests (bun test in packages/tixi)
bun run typecheck   # tsc --noEmit in every workspace
bun run build       # tsdown -> packages/tixi/dist (also rewrites `exports` in its package.json)
bun run dev         # playground at http://localhost:3100
bun run studio      # Remotion Studio at http://localhost:3200
bun run lint        # biome check (lint + format + import order)
bun run lint:fix    # biome check --write
```

- Git hooks (lefthook, installed by `bun install` via `prepare`): pre-commit runs Biome with fixes on staged files and the typecheck; pre-push runs `biome ci`, the typecheck and the tests. Config is in `lefthook.yml`, and `lefthook-local.yml` is for personal overrides.

- Single test file: `cd packages/tixi && bun test test/layout.test.ts`.
- Single test by name: add `-t "<name>"`.
- Render the Remotion sample: `cd examples/remotion && bun run render` (writes `out/showcase.mp4`).
- Representative stills: `bun run stills` (writes `out/stills/*.png`); `bun run stills News Quiz` limits it to those compositions. Inspecting stills is the practical way to check rendering changes visually.

TypeScript is v7 (native). tsdown warns that its API is experimental; that warning is expected.

## Workspace resolution (`tixi-source` condition)

tsdown uses `exports.devExports: "tixi-source"`. Each export in `packages/tixi/package.json` therefore maps `tixi-source` to `src/*.ts` and `default` to `dist/*.js`.

- **Don't hand-edit that `exports` field.** `bun run build` regenerates it.
- The examples enable the condition, so they use library source without a build:
  - Bun: `bun --conditions=tixi-source`
  - Webpack: `resolve.conditionNames` in `remotion.config.ts`
  - TypeScript: `customConditions` in each example's tsconfig
- If a workspace link goes missing (`Cannot find module 'tixi'`), delete every `node_modules` and run `bun install` again.

## Architecture (packages/tixi/src)

The pipeline has three stages: **layout (pure) → rasterize (Canvas 2D) → compose (PixiJS)**.

1. **Layout** (`layout/`) is pure TypeScript with an injected `Measurer`. Tests use `test/fakeMeasurer.ts`: CJK = 1em, ASCII = 0.5em, space = 0.25em, and no canvas.
   - `segment.ts`: grapheme clusters, then break opportunities. Breaks are `BREAK_PREFERRED` or `BREAK_FALLBACK`; the fallback level marks breaks inside a phrase in `lineBreak: "phrase"` mode. Kinsoku rules can block a break.
   - `layout.ts`: greedy line breaking, alignment and justify. `overflow: "shrink"` binary-searches a `fontScale`; `"squeeze"` compresses each line.
   - Kerning comes from measuring growing prefixes of a run. It is stored separately from each cluster's own advance: `kern[k]` shifts glyph k and is dropped at line starts. Folding kerning into the advance was a real bug (「 after 。 got hidden behind the next glyph).
2. **Style model** (`style/`): every decoration is a `Layer` (the glyph grown by `stroke` px and painted with `paint`), stacked bottom → top.
   - A rich-text run's `layers` is either an array (replaces all layers) or a patch keyed by index or `id`. Patches are resolved in `merge.ts`.
3. **Render** (`render/`, `TelopNode.ts`):
   - Each glyph × layer is rasterized once into its own canvas texture (`rasterize.ts`), cached in `TextureCache`. The cache key includes the sub-pixel offset, the layer shape, the paint, and the paint's scope box relative to the glyph.
   - When scaleX equals scaleY, strokes use native `strokeText`. When they differ (長体/平体), strokes are grown from a supersampled signed distance field (`sdf.ts`) so outline width stays uniform.
   - `planGroups` groups sprites by **layer slot** (index) plus an effects signature (offset, blur, opacity, blend mode, filters). Groups render in slot order, so all outlines sit below all fills.
   - Inside a group, sprites use `blendMode: "max"`. Every group container always gets an `AlphaFilter` to isolate it, so overlapping semi-transparent outlines don't compound.
   - `TelopNode.refresh()` compares a `stableKey` of the props minus `glyphTransform`. Only when that key changes does it rebuild. Otherwise it just reapplies glyph transforms to existing sprites, which keeps per-frame animation cheap.
   - `stableKey` hashes plain data structurally and class instances (filters, images) by identity.
4. **Output**: `TelopRenderer` is one shared offscreen WebGL renderer (`preserveDrawingBuffer: true`).
   - `draw()` renders a node synchronously, then `drawImage`s the result into the target 2D canvas, sized to the node's ink bounds.
   - The renderer only grows, in power-of-two steps. Frequent resizes make PixiJS log "destroyed while still bound" warnings.
   - `BlurFilter` strength is in local (CSS) px, not device px: never multiply it by `resolution`. Pixi's own padding (`2 × strength`) is too small for multi-pass blurs and crops shadows, so `TelopNode` sets `padding` from `blurReach` (`render/blur.ts`).

**React/Remotion** (`react/Telop.tsx`, `remotion/Telop.tsx`):
- `<Telop>` keeps a `TelopNode` in a ref and draws in `useLayoutEffect` on every render. It sizes the wrapper div to the layout box and offsets the canvas to the ink bounds.
- It reports `onPendingChange` while the renderer or fonts aren't ready, and also while `document.fonts.status === "loading"`.
- It subscribes to `document.fonts` `loadingdone` (`subscribeFontEpoch`) and re-measures when fonts finish loading.
- The Remotion wrapper maps pending to `delayRender`/`continueRender`.

## Constraints and gotchas

- Fonts: tixi can only load `unicode-range` subsets for `@font-face` rules that are already declared. If a telop draws before the stylesheet loads, it falls back silently. Apps must gate telops on the stylesheet; see `FontGate` in `examples/remotion/src/fonts.tsx`, whose `continueRender` runs in an effect after the children mount.
- Remotion needs `Config.setChromiumOpenGlRenderer("angle")` because PixiJS needs WebGL in headless Chrome.
- Known limitations: horizontal text only (vertical writing is planned), no ligatures (glyphs are drawn individually), and overlapping outlines of different colors in the same slot combine per channel with `max`.
- Pixi, Remotion and React are peer deps that tsdown keeps external. Code under `layout/`, `style/` and `markup.ts` must stay free of Pixi/DOM runtime imports so `bun test` can run it.
