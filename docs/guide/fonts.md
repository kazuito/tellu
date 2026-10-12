---
description: How tellu loads web fonts, why the stylesheet must be declared before drawing, the gating pattern for Remotion, React and plain canvases, and checking that a caption gets the fonts it asks for.
---

# Fonts

Captions live and die by their typeface, and fonts are the most common source of "it looked right in the preview" bugs. This page explains what tellu does for you and the one thing it can't.

## What tellu does

Before drawing, tellu works out every font a caption uses and which characters each font draws:

```ts
import { fontRequests } from "tellu";

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

Wrap each composition in `<FontGate>`. Releasing the gate's handle in an effect *after* the children mount matters. Each `<Text>` from `tellu/remotion` places its own `delayRender` while it loads the font subsets it needs. Releasing the gate first would leave a gap in which Remotion could capture an empty frame.

If you load fonts with `@remotion/google-fonts` or `@remotion/fonts`, the `@font-face` rules are added for you. Just make sure that happens before `<Text>` mounts.

To make a render fail instead of shipping a frame in the wrong font, set [`fontCheck="error"`](#checking-fonts) on `<Text>`.

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

## Checking fonts

Once the fonts are loaded, tellu checks that the caption can actually be drawn with them, and reports what it finds:

| Issue | When |
| --- | --- |
| `family-not-found` | No `@font-face` rule declares the family, and it isn't installed |
| `face-unavailable` | The family is declared, but no face has the weight and style the style asks for. The browser picks the nearest face and may synthesize bold or italic |
| `load-failed` | A face the text needs failed to load, e.g. a wrong URL |
| `missing-glyphs` | No font in the stack has some of the characters, so they fall back |

A stack that contains a generic family, such as `["Dela Gothic One", "sans-serif"]`, accepts any fallback, so its characters aren't checked. Its named families still are.

`<Text>` and `createCanvasText()` check every caption. The `fontCheck` option decides what happens:

- `"warn"` (the default) logs each issue once with `console.warn`. The check runs alongside drawing and never delays it.
- `"error"` reports the issues as a [`FontIssueError`](/api/layout#fontissueerror): `<Text>` passes it to `onError` and stays pending, so in Remotion the render fails through `cancelRender()`, and `createCanvasText()` rejects. `<Text>` also waits for the check before drawing counts as done.
- `"off"` skips the check.

In Remotion, failing the render is usually what you want for final output, and a warning is enough in Studio:

```tsx
import { getRemotionEnvironment } from "remotion";
import { Text } from "tellu/remotion";

<Text
  text="速報"
  textStyle={{ fontFamily: "Noto Sans JP", fontWeight: 900 }}
  fontCheck={getRemotionEnvironment().isRendering ? "error" : "warn"}
/>;
```

`onFontIssues` receives the issues in `"warn"` and `"error"` mode, e.g. to show them in your own UI.

With a raw `TextNode`, call [`checkFonts()`](/api/layout#checkfonts) yourself. It loads the fonts first, like `loadFonts()`:

```ts
import { checkFonts } from "tellu";

const issues = await checkFonts(props);
for (const issue of issues) console.warn(issue.message);
```

To find characters no font has, tellu measures them with a tiny font that draws nothing ([Adobe Blank 2](https://github.com/adobe-fonts/adobe-blank-2), embedded, SIL Open Font License) at the end of the stack. It is added to `document.fonts` as `tellu-blank-check` the first time a check runs.

## Choosing fonts

Telops are usually set in heavy weights, and a few faces cover most looks. All the fonts on this site come from Google Fonts:

```ts demo compare
import { fill, stroke, type TextNodeProps } from "tellu";

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
The examples request Google Fonts with `display=block`, so DOM text never flashes a fallback face. tellu itself waits for the faces it needs either way.
:::

## Troubleshooting

**Text renders in the wrong font.** The stylesheet wasn't loaded when the caption was first drawn. Check the order: stylesheet `onload`, then mount or draw. The console shows a `family-not-found` or `load-failed` warning from the [font check](#checking-fonts).

**The first frame is wrong, later frames are right.** Same cause. In interactive apps, `<Text>` recovers when the font arrives, but Remotion has already captured that frame.

**Some characters fall back.** That `unicode-range` subset wasn't declared, or the font doesn't contain those glyphs (common for symbols and emoji in Japanese display fonts). The font check reports them as `missing-glyphs`. Put a fallback family in `fontFamily`: `["Dela Gothic One", "Noto Sans JP"]`.

**The text looks bolder or thinner than expected.** The weight isn't loaded, e.g. the stylesheet URL asks for `wght@400` but the style uses `fontWeight: 900`. The font check reports `face-unavailable`.
