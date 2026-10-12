---
description: API reference for tellu/remotion, the Text component that holds Remotion frames with delayRender until a caption is drawn.
---

# tellu/remotion

```ts
import { Text } from "tellu/remotion";
```

Guide: [Remotion](/guide/remotion).

## `Text`

[`<Text>` from `tellu/react`](./react#text) that holds Remotion's frame capture until the caption is drawn:

- calls `delayRender()` on mount, and again whenever new props need fonts that aren't loaded yet;
- calls `continueRender()` once the renderer is ready, the fonts are loaded and the current props are drawn;
- passes errors to `cancelRender()`, so a render fails instead of hanging. With `fontCheck="error"`, that includes [font issues](/guide/fonts#checking-fonts), such as a family that isn't declared.

Render with `--gl=angle` (or `Config.setChromiumOpenGlRenderer("angle")`), because PixiJS needs WebGL in headless Chrome.

### `RemotionTextProps`

Every [`TextProps`](./react#textprops) prop, plus:

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `delayRenderLabel` | `string` | `"tellu: drawing text"` | Shown if Remotion times out waiting |

## Re-exports

For convenience, `tellu/remotion` also exports these from `tellu/react`:

- [`Anchor`](./react#anchor)
- [`TextDrawEvent`](./react#textdrawevent)
- [`TextRendererProvider`](./react#textrendererprovider)
- [`useTextRenderer`](./react#usetextrenderer)
