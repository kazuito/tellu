---
description: Cinematic captions, covering film subtitles, a title card with a gold gradient and wide tracking, and end credits.
---

# Film & titles

Quieter typography: thin shadows, generous tracking and serif faces.

## Film subtitles

Japanese film subtitles favor a light weight and a soft shadow over an outline.

```ts demo
import { fill, shadow } from "tellu";

export default {
  text: "あの夏の日のことを\n今でも覚えている",
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 400,
    fontSize: 40,
    lineHeight: 1.5,
    letterSpacing: { em: 0.05 },
    layers: [
      shadow({ offset: [0, 0], blur: 6, stroke: 3, color: "rgba(0,0,0,0.85)" }),
      shadow({ offset: [2, 2], blur: 1, color: "rgba(0,0,0,0.6)" }),
      fill("#f4f1ea"),
    ],
  },
};
```

## Title card

A serif title in gold with wide tracking and a faint glow.

```ts demo
import { fill, glow, linearGradient, parseMarkup, stroke } from "tellu";

export default {
  text: parseMarkup("<en>THE LAST SUMMER</en><br/>最後の夏", {
    en: {
      fontFamily: "Montserrat",
      fontWeight: 800,
      fontSize: 26,
      letterSpacing: { em: 0.5 },
    },
  }),
  align: "center",
  style: {
    fontFamily: "Noto Serif JP",
    fontWeight: 900,
    fontSize: 88,
    lineHeight: 1.5,
    letterSpacing: { em: 0.3 },
    layers: [
      glow({ color: "rgba(255, 200, 120, 0.6)", stroke: 2, blur: 18 }),
      stroke(1.5, "#7a5a1e"),
      fill(
        linearGradient([
          [0, "#fff6d6"],
          [0.45, "#e9c46a"],
          [0.55, "#b8862b"],
          [1, "#f2d38b"],
        ]),
      ),
    ],
  },
};
```

## End credits

Role and name in two styles, one block per entry. In a video, scroll the whole block with CSS.

```ts demo
import { fill, parseMarkup } from "tellu";

const credits = [
  ["監督", "山田 太郎"],
  ["脚本", "佐藤 花子"],
  ["撮影", "鈴木 一郎"],
];

export default {
  text: parseMarkup(
    credits
      .map(([role, name]) => `<role>${role}</role><br/>${name}`)
      .join("<br/><br/>"),
    {
      role: {
        fontSize: 18,
        fontWeight: 400,
        letterSpacing: { em: 0.4 },
        layers: [fill("#a8a8a8")],
      },
    },
  ),
  align: "center",
  style: {
    fontFamily: "Noto Serif JP",
    fontWeight: 700,
    fontSize: 32,
    lineHeight: 1.6,
    letterSpacing: { em: 0.15 },
    layers: [fill("#f4f1ea")],
  },
};
```
