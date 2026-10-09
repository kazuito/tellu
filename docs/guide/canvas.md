---
description: Draw captions into any HTML or offscreen canvas with createCanvasText, without touching PixiJS, and update them synchronously.
---

# Canvas

`createCanvasText()` draws a caption into a canvas you own, with no React and no PixiJS scene to manage. It suits vanilla apps, editors and thumbnail generation.

```ts
import { createCanvasText, fill, stroke } from "tellu";

const canvas = document.querySelector("canvas")!;

const caption = await createCanvasText(canvas, {
  text: "こんにちは",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(10, "#000"), fill("#fff")] },
});
```

The promise resolves once the shared renderer exists, the fonts are loaded and the first frame is drawn.

## The canvas is resized

Each draw **resizes the canvas** to the caption's ink bounds (outlines, shadows and plates included) at the node's resolution, which defaults to `devicePixelRatio`. Set the CSS size from the result:

```ts
const { width, height } = caption.lastDraw;
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;
```

`lastDraw.x` and `lastDraw.y` are the canvas's offset from the layout box's top-left corner. Outlines reach left of and above the text, so they are usually negative. To place the *text* at a point, offset the canvas by them:

```ts
canvas.style.left = `${textX + caption.lastDraw.x}px`;
canvas.style.top = `${textY + caption.lastDraw.y}px`;
```

## Updating

```ts
caption.update({ text: "さようなら" }); // merges props, redraws synchronously, returns the new DrawResult
caption.draw();                          // redraws with the current props
caption.destroy();                       // frees the node's textures
```

`update()` is synchronous. If the new props use a font or characters that haven't been loaded, call [`loadFonts()`](/api/layout#loadfonts) first:

```ts
const next = { text: "新しい文字列" };
await loadFonts({ ...caption.node.props, ...next });
caption.update(next);
```

## A fixed-size canvas for animation

Ink bounds change as glyphs move, so an animated caption would resize the canvas every frame. Draw a fixed region instead with the renderer's `bounds` option:

```ts
const region = { x: -40, y: -60, width: 900, height: 260 };

function frame(time: number) {
  caption.node.update({ glyphTransform: (glyph) => ({ y: Math.sin(time / 200 + glyph.index) * 20 }) });
  caption.renderer.draw(caption.node, canvas, { bounds: region });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

The animated demos on this site sample a few frames, take the union of `node.getInkBounds()`, and draw that region every frame.

## Options

```ts
createCanvasText(canvas, props, {
  resolution: 2,          // glyph bitmap density (default: devicePixelRatio)
  waitForFonts: true,     // load needed fonts before the first draw (default)
  renderer,               // a TextRenderer (default: TextRenderer.shared())
  measurer,               // a custom Measurer (default: Canvas 2D)
});
```

`canvas` may also be an `OffscreenCanvas`, for example to get an `ImageBitmap` or a PNG blob of a caption.
