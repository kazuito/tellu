---
description: Install tixi and draw a first caption with Remotion, React, a plain canvas or a PixiJS scene.
---

# Quick start

## Install

tixi needs PixiJS v8 as a peer dependency. React and Remotion are optional peers, needed only for their entry points.

::: code-group

```sh [bun]
bun add tixi pixi.js
```

```sh [npm]
npm install tixi pixi.js
```

```sh [pnpm]
pnpm add tixi pixi.js
```

```sh [yarn]
yarn add tixi pixi.js
```

:::

## Your first caption

Every example on this site exports the same thing: the props of a caption. Here is a white caption with a black outline:

```ts demo
import { fill, stroke } from "tixi";

export default {
  text: "はじめてのテロップ",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [stroke(12, "#111111"), fill("#ffffff")],
  },
};
```

`layers` runs from bottom to top: the 12 px black outline is drawn first and the white glyph goes on top. The [Layers](./layers) guide covers this model in depth.

Pass the same props to whichever API fits your app:

::: code-group

```tsx [Remotion]
import { fill, stroke } from "tixi";
import { Text } from "tixi/remotion";

export const Caption = () => (
  <Text
    text="はじめてのテロップ"
    textStyle={{
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 72,
      layers: [stroke(12, "#111111"), fill("#ffffff")],
    }}
    anchor="bottom"
    style={{ position: "absolute", left: 960, top: 1000 }}
  />
);
```

```tsx [React]
import { fill, stroke } from "tixi";
import { Text } from "tixi/react";

export const Caption = () => (
  <Text
    text="はじめてのテロップ"
    textStyle={{
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 72,
      layers: [stroke(12, "#111111"), fill("#ffffff")],
    }}
  />
);
```

```ts [Canvas]
import { createCanvasText, fill, stroke } from "tixi";

const canvas = document.querySelector("canvas")!;
const caption = await createCanvasText(canvas, {
  text: "はじめてのテロップ",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [stroke(12, "#111111"), fill("#ffffff")],
  },
});

caption.update({ text: "更新も同期的" });
```

```ts [PixiJS]
import { fill, loadFonts, stroke, TextNode, type TextNodeProps } from "tixi";

const props: TextNodeProps = {
  text: "はじめてのテロップ",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [stroke(12, "#111111"), fill("#ffffff")],
  },
};

await loadFonts(props);
const node = new TextNode(props, { resolution: app.renderer.resolution });
app.stage.addChild(node);
```

:::

::: tip The two `style`s in React
In `<Text>`, `textStyle` is the caption's style and `style` is the CSS of the wrapper element, as with any React component.
:::

## Load your fonts first

tixi measures text with the browser's fonts. A web font must be **declared** (its stylesheet loaded) before the text is drawn, or tixi silently measures a fallback font. Once the `@font-face` rules exist, tixi loads exactly the faces and `unicode-range` subsets each caption needs.

The [Fonts](./fonts) guide shows the pattern for each environment. Read it before shipping anything.

## Where to go next

<div class="next-steps">

- **[Layers](./layers)**: outlines, shadows and glows
- **[Paint](./paint)**: gradients and patterns
- **[Rich text](./rich-text)**: style part of the text
- **[Glyph transforms](./animation)**: animate each glyph
- **[Remotion](./remotion)**: render captions to video
- **[Examples](/examples/)**: real-world recipes

</div>
