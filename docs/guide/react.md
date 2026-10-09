---
description: Use <Text> from tellu/react in any React app, with layout-box sizing, anchors, draw callbacks, pending state and a shared renderer.
---

# React

`tellu/react` exports `<Text>`, a component that draws a caption into its own `<canvas>`. It is the same component `tellu/remotion` wraps, without the Remotion-specific frame holding.

```tsx
import { fill, stroke } from "tellu";
import { Text } from "tellu/react";

const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 48,
  layers: [stroke(8, "#111"), fill("#fff")],
};

export function Title({ children }: { children: string }) {
  return <Text text={children} textStyle={style} maxWidth={600} align="center" />;
}
```

## Sizing and layout

The wrapper `<div>` is `inline-block` and takes the size of the **layout box**: the widest line (or `maxWidth`) by the total line height. It flows with surrounding content like an image.

The canvas inside is positioned absolutely and sized to the caption's **ink bounds**, everything it paints. Outlines, shadows and plates therefore overflow the box visually without pushing other elements around. Make sure no ancestor clips them with `overflow: hidden`.

`anchor` shifts the wrapper with a CSS `translate` so a chosen point of the box sits at its position. See [Remotion › Positioning](./remotion#positioning).

## Drawing

`<Text>` draws synchronously in a layout effect on every render, so the canvas always matches the props. Repeated renders with the same props are cheap:

- props are compared structurally, apart from `glyphTransform`,
- when only `glyphTransform` changes, existing sprites are moved,
- glyph textures are cached per node.

## Fonts

By default (`waitForFonts`), `<Text>` loads the faces and `unicode-range` subsets it needs before the first draw, and redraws when the document finishes loading fonts later. Your stylesheet must still be loaded first. See [Fonts](./fonts).

## Events

| Prop | Called |
| --- | --- |
| `onDraw(event)` | After each draw, with the drawn region, the `layout` and the `TextNode` |
| `onPendingChange(pending)` | When the caption starts or stops waiting for the renderer or fonts |
| `onError(error)` | When creating the renderer, loading fonts or drawing fails. Without it, draw errors throw |

`onDraw` is the hook for measuring: `event.layout.width`, `event.layout.lines.length` and `event.layout.fontScale` are all available.

## The renderer

All `<Text>` components share one offscreen WebGL renderer, `TextRenderer.shared()`, and copy their result into their own 2D canvas. One WebGL context serves the whole page, so browsers never hit their context limit.

To use a specific renderer for a subtree, for example with custom PixiJS options, wrap it in `TextRendererProvider`:

```tsx
import { TextRenderer } from "tellu";
import { TextRendererProvider } from "tellu/react";

const renderer = TextRenderer.create({ powerPreference: "high-performance" });

<TextRendererProvider renderer={renderer}>
  <App />
</TextRendererProvider>;
```

`renderer` accepts a `TextRenderer` or a promise of one. `useTextRenderer()` returns the renderer for the current subtree, or `null` while it is being created.

## Server rendering

On the server, `<Text>` renders its wrapper with an empty canvas and draws after hydration. The wrapper has no size until then, so reserve space with CSS if the layout must not shift.

See the [`tellu/react` reference](/api/react) for every prop.
