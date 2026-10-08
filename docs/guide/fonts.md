---
description: How tixi loads web fonts, why the stylesheet must be declared before drawing, and the gating pattern for Remotion, React and plain canvases.
---

# Fonts

Captions live and die by their typeface, and fonts are the most common source of "it looked right in the preview" bugs. This page explains what tixi does for you and the one thing it can't.

## What tixi does

Before drawing, tixi works out every font a caption uses and which characters each font draws:

```ts
import { fontRequests } from "tixi";

fontRequests({
  text: [{ text: "速報", style: { fontFamily: "Dela Gothic One", fontWeight: 400 } }, " 新商品"],
  style: { fontFamily: "Noto Sans JP", fontWeight: 900 },
});
// [
//   { font: 'normal 400 16px "Dela Gothic One"', text: "速報" },
//   { font: 'normal 900 16px "Noto Sans JP"', text: " 新商品" },
// ]
```

It then calls `document.fonts.load(font, text)` for each one. Japanese web fonts are split into dozens of `unicode-range` subsets. Passing the text means only the subsets those characters live in are downloaded, which is fast and exact.

- `<Text>` (React and Remotion) and `createCanvasText()` do this automatically. Both take `waitForFonts`, which defaults to `true`.
- With a raw `TextNode`, call [`loadFonts(props)`](/api/layout#loadfonts) yourself before creating it.
- `<Text>` also re-measures when the document finishes loading fonts later (`document.fonts` `loadingdone`), so a late font fixes itself in interactive apps.

## The one rule: declare fonts before drawing

`document.fonts.load()` can only load faces that some `@font-face` rule declares. If a caption is drawn **before** the stylesheet with those rules has loaded, there is nothing to load. The browser measures and draws a fallback font, and nothing fails.

::: danger Silent fallback
With Google Fonts or any other `<link rel="stylesheet">`, the `@font-face` rules don't exist until that stylesheet has loaded. Gate your captions on it.
:::

### Remotion

Hold the render with `delayRender` until the stylesheet has loaded, and mount the captions only after that:

```tsx
import { type ReactNode, useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

const STYLESHEET = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@900&display=block";

let stylesheet: Promise<void> | undefined;
function loadStylesheet(): Promise<void> {
  stylesheet ??= new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET;
    link.onload = link.onerror = () => resolve();
    document.head.append(link);
  });
  return stylesheet;
}

export const FontGate = ({ children }: { children: ReactNode }) => {
  const [handle] = useState(() => delayRender("Loading font stylesheet"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadStylesheet().then(() => setReady(true));
  }, []);

  // By the time this effect runs, the children have rendered and placed their own delayRender.
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);

  return ready ? children : null;
};
```

Wrap each composition in `<FontGate>`. Releasing the gate's handle in an effect *after* the children mount matters. Each `<Text>` from `tixi/remotion` places its own `delayRender` while it loads the font subsets it needs. Releasing the gate first would leave a gap in which Remotion could capture an empty frame.

If you load fonts with `@remotion/google-fonts` or `@remotion/fonts`, the `@font-face` rules are added for you. Just make sure that happens before `<Text>` mounts.

### React

Same idea, without `delayRender`: render the captions once the stylesheet's `onload` has fired. If a caption does draw early, `<Text>` redraws when the fonts arrive, but you will see the fallback for a moment.

### Plain canvas or PixiJS

Load the stylesheet, then draw:

```ts
await new Promise((resolve) => {
  const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: STYLESHEET });
  link.onload = link.onerror = resolve;
  document.head.append(link);
});

const caption = await createCanvasText(canvas, props); // loads the needed subsets, then draws
```

## Choosing fonts

Telops are usually set in heavy weights, and a few faces cover most looks. All the fonts on this site come from Google Fonts:

```ts demo compare
import { fill, stroke, type TextNodeProps } from "tixi";

const sample = (fontFamily: string, fontWeight = 400): TextNodeProps => ({
  text: "速報テロップ",
  style: {
    fontFamily,
    fontWeight,
    fontSize: 44,
    layers: [stroke(7, "#111"), fill("#fff")],
  },
});

export default {
  "Noto Sans JP 900": sample("Noto Sans JP", 900),
  "Noto Serif JP 900": sample("Noto Serif JP", 900),
  "Dela Gothic One": sample("Dela Gothic One"),
  "Zen Maru Gothic 900": sample("Zen Maru Gothic", 900),
  "RocknRoll One": sample("RocknRoll One"),
  "Reggae One": sample("Reggae One"),
};
```

`fontFamily` takes a CSS family list (`"Noto Sans JP, sans-serif"`) or an array (`["Noto Sans JP", "sans-serif"]`). Names are quoted for you, and generic families like `sans-serif` are left as they are.

::: tip `display=block`
The examples request Google Fonts with `display=block`, so DOM text never flashes a fallback face. tixi itself waits for the faces it needs either way.
:::

## Troubleshooting

**Text renders in the wrong font.** The stylesheet wasn't loaded when the caption was first drawn. Check the order: stylesheet `onload`, then mount or draw.

**The first frame is wrong, later frames are right.** Same cause. In interactive apps, `<Text>` recovers when the font arrives, but Remotion has already captured that frame.

**Some characters fall back.** That `unicode-range` subset wasn't declared, or the font doesn't contain those glyphs (common for symbols and emoji in Japanese display fonts). Put a fallback family in `fontFamily`: `["Dela Gothic One", "Noto Sans JP"]`.
