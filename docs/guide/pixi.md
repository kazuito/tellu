---
description: Put TextNode, a regular PixiJS container, straight into your own PixiJS application and animate it there.
---

# PixiJS scene

`TextNode` is a PixiJS `Container`. If you already have a PixiJS application, add captions to it like any other display object:

```ts
import { Application } from "pixi.js";
import { fill, loadFonts, stroke, TextNode, type TextNodeProps } from "tellu";

const app = new Application();
await app.init({ width: 1280, height: 720, resolution: devicePixelRatio, autoDensity: true });
document.body.append(app.canvas);

const props: TextNodeProps = {
  text: "Pixiシーンに直接配置",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(10, "#e63946"), fill("#f1faee")] },
};

await loadFonts(props);
const node = new TextNode(props, { resolution: app.renderer.resolution });
node.position.set((1280 - node.layout.width) / 2, (720 - node.layout.height) / 2);
app.stage.addChild(node);
```

The node's local origin is the **top-left of the layout box**. Its position, scale, rotation, alpha, filters and masks work like any container's.

## Things to know

- **Load fonts first.** `TextNode` measures in its constructor. Await [`loadFonts(props)`](/api/layout#loadfonts) before creating it, and again before an update that brings new fonts or characters.
- **Match the resolution.** Pass your renderer's resolution as `resolution` so glyph bitmaps are sharp. Scaling the node up past that makes them soft. Set `node.resolution` to re-rasterize at a new density.
- **Updates are synchronous.** `node.update(partialProps)` merges and rebuilds right away. `node.props = fullProps` replaces them.
- **Destroy it.** `node.destroy()` releases its glyph bitmaps and frees the filters it created. Filters you passed in are left alone.

## Animating

Update `glyphTransform` from your ticker. Only sprite transforms change, so nothing is re-rasterized:

```ts
app.ticker.add(({ lastTime }) => {
  node.update({
    glyphTransform: (glyph) => ({ opacity: 0.4 + 0.6 * Math.abs(Math.sin(lastTime / 400 - glyph.index * 0.4)) }),
  });
});
```

## Measuring

| | |
| --- | --- |
| `node.layout` | The [layout](/api/layout#layout): lines, glyph positions, size, `fontScale` |
| `node.layoutBounds` | The layout box, `(0, 0, width, height)` |
| `node.getInkBounds()` | Everything the node paints, in local coordinates |

## Fonts changed after creation

If a web font finishes loading after the node was built, call `node.invalidate()`. It clears cached measurements and textures and rebuilds.

To draw only when something changed, compare `node.revision` with its value at your last draw. It increments on every rebuild and whenever glyph transforms produce new output.
