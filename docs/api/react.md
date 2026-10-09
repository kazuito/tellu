---
description: API reference for tellu/react, covering the Text component and its props, Anchor, TextDrawEvent, TextRendererProvider and useTextRenderer.
---

# tellu/react

```ts
import { Text, TextRendererProvider, useTextRenderer } from "tellu/react";
```

Guide: [React](/guide/react).

## `Text`

```tsx
<Text text="テロップ" textStyle={{ fontSize: 64 }} maxWidth={800} anchor="bottom" />
```

Draws a caption into a canvas. The element takes the size of the layout box, and outlines, shadows and transformed glyphs paint outside it. Forwards its ref to the wrapper `<div>`.

### `TextProps`

Every [`TextNodeProps`](./types#textnodeprops) option except `style`, plus:

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `textStyle` | `Partial<TextStyle>` | | The caption's style (`style` in `TextNodeProps`) |
| `anchor` | [`Anchor`](#anchor) | `"top-left"` | Point of the layout box placed at the element's position |
| `resolution` | `number` | `devicePixelRatio` | |
| `alt` | `string` | The caption's text | Read by screen readers and find-in-page instead of the caption's text. `""` marks it as decorative. [Guide](/guide/react#accessibility) |
| `waitForFonts` | `boolean` | `true` | Load fonts before drawing |
| `renderer` | `TextRenderer` | From context, or `TextRenderer.shared()` | |
| `measurer` | `Measurer` | Canvas 2D | |
| `className` | `string` | | On the wrapper |
| `style` | `CSSProperties` | | On the wrapper |
| `onDraw` | `(event: TextDrawEvent) => void` | | After each draw. Renders that change nothing the caption paints skip the draw |
| `onPendingChange` | `(pending: boolean) => void` | | While fonts or the renderer load |
| `onError` | `(error: unknown) => void` | | Without it, draw errors throw |

### `Anchor`

```ts
type Anchor =
  | "top-left" | "top" | "top-right"
  | "left" | "center" | "right"
  | "bottom-left" | "bottom" | "bottom-right"
  | readonly [x: number, y: number];
```

Applied as `translate: -x% -y%`. Tuples are fractions of the layout box.

### `TextDrawEvent`

[`DrawResult`](./rendering#drawresult) plus:

| Field | |
| --- | --- |
| `layout` | The [`Layout`](./layout#layout) |
| `node` | The [`TextNode`](./rendering#textnode) |

## `TextRendererProvider`

```tsx
<TextRendererProvider renderer={TextRenderer.create()}>…</TextRendererProvider>
```

### `TextRendererProviderProps`

| Prop | Type | |
| --- | --- | --- |
| `renderer` | `TextRenderer \| Promise<TextRenderer>` | Used by every `<Text>` below |
| `children` | `ReactNode` | |

## `useTextRenderer()`

```ts
function useTextRenderer(onError?: (error: unknown) => void): TextRenderer | null;
```

The renderer for the current subtree, or `null` while it is being created.
