---
description: API reference for tixi/remotion, the Text component that holds Remotion frames with delayRender until a caption is drawn.
---

# tixi/remotion

```ts
import { Text } from "tixi/remotion";
```

Guide: [Remotion](/guide/remotion).

## `Text`

[`<Text>` from `tixi/react`](./react#text) that holds Remotion's frame capture until the caption is drawn:

- calls `delayRender()` on mount, and again whenever new props need fonts that aren't loaded yet;
- calls `continueRender()` once the renderer is ready, the fonts are loaded and the current props are drawn;
- passes errors to `cancelRender()`, so a render fails instead of hanging.

Render with `--gl=angle` (or `Config.setChromiumOpenGlRenderer("angle")`), because PixiJS needs WebGL in headless Chrome.

### `RemotionTextProps`

Every [`TextProps`](./react#textprops) prop, plus:

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `delayRenderLabel` | `string` | `"tixi: drawing text"` | Shown if Remotion times out waiting |

## Re-exports

For convenience, `tixi/remotion` also exports these from `tixi/react`:

- [`Anchor`](./react#anchor)
- [`TextDrawEvent`](./react#textdrawevent)
- [`TextRendererProvider`](./react#textrendererprovider)
- [`useTextRenderer`](./react#usetextrenderer)
