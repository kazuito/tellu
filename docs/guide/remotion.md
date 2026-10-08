---
description: Render tixi captions in Remotion videos with <Text> from tixi/remotion, covering delayRender integration, ANGLE for WebGL, font gating, positioning and frame-driven animation.
---

# Remotion

`tixi/remotion` exports `<Text>`, which holds Remotion's frame capture until the caption is fully drawn. You never get a frame with a missing or half-loaded caption.

## Setup

**1. Install**

```sh
bun add tixi pixi.js
```

**2. Enable WebGL in headless Chrome.** PixiJS needs WebGL, and Remotion's default renderer doesn't provide it:

```ts
// remotion.config.ts
import { Config } from "@remotion/cli/config";

Config.setChromiumOpenGlRenderer("angle");
```

For `renderMedia()` / `renderStill()` from `@remotion/renderer`, pass `chromiumOptions: { gl: "angle" }`. On the command line, use `--gl=angle`.

**3. Gate on your font stylesheet.** Wrap compositions in a `FontGate` so no caption is measured before its `@font-face` rules exist. The component is on the [Fonts](./fonts#remotion) page.

## A caption

```tsx
import { AbsoluteFill } from "remotion";
import { fill, linearGradient, shadow, stroke } from "tixi";
import { Text } from "tixi/remotion";

const variety = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 120,
  layers: [
    shadow({ offset: [10, 12], blur: 8, stroke: 30 }),
    stroke(30, "#14206b"),
    stroke(16, "#ffffff"),
    fill(linearGradient(["#fffbd1", "#ffe14d", "#ff9d00"])),
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

`style` and `className` go to the wrapper `<div>`, so CSS transforms, opacity, `clip-path` and flex layout all work on the caption as a whole.

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

Only the transforms change from frame to frame, so each frame costs a few sprite updates and one draw. See [Glyph transforms](./animation) for recipes, and [Performance](./performance) for keeping frames fast.

## How frames are held

`<Text>` calls `delayRender()` when it mounts, and calls `continueRender()` once:

1. the shared WebGL renderer is ready,
2. every font face and subset the caption needs is loaded,
3. the current props are drawn.

If later props need new fonts, it holds the frame again. Errors (for example, no WebGL) go to `cancelRender()`, which fails the render loudly instead of hanging. `delayRenderLabel` sets the label Remotion shows if it times out.

## Tips

- **One WebGL context for everything.** Every `<Text>` shares one offscreen renderer, so hundreds of captions are fine.
- **Studio vs render.** If a caption looks right in Studio but wrong in the render, check `setChromiumOpenGlRenderer("angle")` first, then the font gate.
- **Vertical video.** Nothing changes. Position with `anchor` and lay out with `maxWidth` against your composition size.

See the [`tixi/remotion` reference](/api/remotion) for every prop.
