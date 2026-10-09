---
description: A gallery of real-world caption recipes for variety shows, news, subtitles, YouTube, Shorts and film, all rendered live.
---

# Examples

Real-world captions, rendered live in your browser. Every example is self-contained: copy the code, change the text, and use it in [Remotion](/guide/remotion), [React](/guide/react), [a canvas](/guide/canvas) or [a PixiJS scene](/guide/pixi).

```ts demo backdrop=scene
import { fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "テロップ、全部コードで。",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      shadow({
        color: "rgba(0,0,0,0.45)",
        offset: [8, 10],
        blur: 6,
        stroke: 22,
      }),
      stroke(22, "#14206b"),
      stroke(12, "#ffffff"),
      fill(linearGradient(["#fffbd1", "#ffe14d", "#ff9d00"])),
    ],
  },
};
```

| Collection | Inside |
| --- | --- |
| [Variety shows](./variety) | Classic telop, punchline, cute glow, inner voice, impact pop, quiz |
| [News & subtitles](./broadcast) | News super, breaking label, lower third, speaker subtitles, karaoke |
| [YouTube & Shorts](./social) | Edit subtitles, short-form hook, stream alert, sale price |
| [Film & titles](./cinema) | Film subtitles, title card, end credits |

## Using an example in Remotion

Examples export `TextNodeProps`, the props of a caption. With `<Text>`, `style` is called `textStyle`:

```tsx
import { Text } from "tellu/remotion";

const { style, ...props } = example; // an example's default export
<Text {...props} textStyle={style} anchor="bottom" style={{ position: "absolute", left: 960, top: 980 }} />;
```

Animated examples export a function of the frame instead. Call it with `useCurrentFrame()`:

```tsx
const frame = useCurrentFrame();
const { style, ...props } = example(frame);
```

The [`examples/remotion`](https://github.com/kazuito/tellu/tree/main/examples/remotion) project in the repository has complete Remotion compositions (variety show, subtitles, news, quiz, film credits and more) plus a vertical Shorts video.
