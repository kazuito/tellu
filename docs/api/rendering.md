---
description: API reference for createCanvasText, CanvasText, TextNode, TextRenderer, draw options and results, and createGlyphContexts.
---

# Rendering

## `createCanvasText()`

```ts
function createCanvasText(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  props: TextNodeProps,
  options?: CreateCanvasTextOptions,
): Promise<CanvasText>;
```

Creates a [`TextNode`](#textnode) and draws it into `canvas` with a [`TextRenderer`](#textrenderer). The canvas is resized to the caption's ink bounds on every draw. Resolves after the renderer is ready, the fonts are loaded (unless `waitForFonts: false`) and the first draw is done.

Guide: [Canvas](/guide/canvas).

### `CreateCanvasTextOptions`

Extends [`TextNodeOptions`](#textnodeoptions).

| Option | Type | Default | |
| --- | --- | --- | --- |
| `renderer` | `TextRenderer` | `TextRenderer.shared()` | |
| `waitForFonts` | `boolean` | `true` | Load the needed fonts before the first draw |
| `fontCheck` | [`FontCheckMode`](./layout#fontcheckmode) | `"warn"` | Check the fonts of the initial props before the first draw: log issues, reject with a [`FontIssueError`](./layout#fontissueerror) (`"error"`), or skip the check. [Guide](/guide/fonts#checking-fonts) |
| `resolution` | `number` | `devicePixelRatio` | |
| `measurer` | `Measurer` | Canvas 2D | |

### `CanvasText`

| Member | |
| --- | --- |
| `node: TextNode` | The underlying node |
| `renderer: TextRenderer` | The renderer drawing it |
| `lastDraw: DrawResult` | Region drawn by the last draw, relative to the layout box |
| `update(props: Partial<TextNodeProps>): DrawResult` | Merges props and redraws synchronously |
| `draw(): DrawResult` | Redraws with the current props |
| `destroy(): void` | Destroys the node |

## `TextNode`

```ts
class TextNode extends Container {
  constructor(props: TextNodeProps, options?: TextNodeOptions);
}
```

A caption as a PixiJS `Container`. Its local origin is the top-left of the layout box. The constructor lays out and builds synchronously, so [load fonts](./layout#loadfonts) first.

Guide: [PixiJS scene](/guide/pixi).

| Member | |
| --- | --- |
| `props: TextNodeProps` | Get, or set to replace all props and refresh |
| `update(props: Partial<TextNodeProps>): this` | Merges props and refreshes |
| `refresh(): void` | Rebuilds if anything but `glyphTransform` changed, then reapplies glyph transforms |
| `invalidate(): void` | Clears cached measurements and bitmaps, then rebuilds. Use it after fonts change. Bitmaps are shared, so other nodes re-rasterize on their next rebuild |
| `revision: number` | Increments whenever what the node paints changes: a rebuild, or glyph transforms with new output. Compare it to skip redundant draws |
| `resolution: number` | Get, or set to re-rasterize at a new pixel density |
| `layout: Layout` | The current [layout](./layout#layout) |
| `layoutBounds: Rectangle` | `(0, 0, layout.width, layout.height)` |
| `getInkBounds(): Rectangle` | Everything the node paints (outlines, shadows, blur, plate, transforms) in local coordinates |
| `destroy(options?)` | Destroys the node and its children, releases its glyph bitmaps and frees the filters it created. Your own filters are left alone. Bitmaps are shared between nodes, so `options` never destroys them |

### `TextNodeOptions`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `measurer` | [`Measurer`](./layout#measurer) | [`getDefaultMeasurer()`](./layout#getdefaultmeasurer) | Text measurement backend |
| `resolution` | `number` | `devicePixelRatio` or `1` | Pixel density of glyph bitmaps |

## `TextRenderer`

One offscreen PixiJS renderer that draws `TextNode`s into ordinary canvases, so any number of captions share one WebGL context.

```ts
class TextRenderer {
  static create(options?: TextRendererOptions): Promise<TextRenderer>;
  static shared(options?: TextRendererOptions): Promise<TextRenderer>;
  readonly renderer: Renderer;
  draw(node: TextNode, target: HTMLCanvasElement | OffscreenCanvas, options?: DrawOptions): DrawResult;
  destroy(): void;
}
```

| Member | |
| --- | --- |
| `TextRenderer.create(options?)` | A new renderer |
| `TextRenderer.shared(options?)` | The renderer shared by `<Text>` and `createCanvasText()`. Options apply only to the first call |
| `renderer` | The underlying PixiJS `Renderer` |
| `draw(node, target, options?)` | Renders `node` and copies it into `target`, resizing `target` to the drawn region. Synchronous |
| `destroy()` | Destroys the renderer. A destroyed shared renderer is recreated on the next `shared()` call |

`draw()` renders the node in its own local space, ignoring its position, scale, rotation and parent, so a node can sit in a scene and still be drawn on its own.

### `TextRendererOptions`

PixiJS `AutoDetectOptions`, merged over tellu's defaults: `preference: "webgl"`, `backgroundAlpha: 0`, `antialias: false`, `preserveDrawingBuffer: true`.

### `DrawOptions`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `resolution` | `number` | The node's resolution | Output pixel density. Changing it re-rasterizes the node |
| `bounds` | `{ x, y, width, height }` | `node.getInkBounds()` | Region to draw, in the node's local coordinates |

### `DrawResult`

| Field | |
| --- | --- |
| `x`, `y` | Top-left of the drawn region in the node's local coordinates (integers) |
| `width`, `height` | Size of the drawn region in CSS px |
| `resolution` | Pixel density, so the canvas is `width × resolution` pixels wide |

## `createGlyphContexts()`

```ts
function createGlyphContexts(layout: Layout): GlyphContext[];
```

The [`GlyphContext`](./types#glyphcontext) objects that `glyphTransform` receives, for any layout. Useful for precomputing animation timing from a [`layoutText()`](./layout#layouttext) result.
