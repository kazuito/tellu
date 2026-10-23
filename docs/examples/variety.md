---
description: Variety-show captions to copy, including the classic gradient telop, punchline, cute glow, inner voice, impact pop, gold lettering and quiz answer.
---

# Variety shows

The loud, layered captions of Japanese variety TV, the look tellu was built for. Every example is complete: copy it, swap the text, done.

## Classic telop

Navy and white outlines, a shadow cast by the whole outline, a warm gradient fill, and an emphasized word that patches two layers.

```ts demo
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tellu";

export default {
  text: parseMarkup("今日は<em>最高</em>の一日！", {
    em: {
      fontSize: 104,
      layers: {
        edge: { paint: "#8a0036" },
        face: { paint: linearGradient(["#ff8cc6", "#ff2e7e", "#d4005c"]) },
      },
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 76,
    letterSpacing: 2,
    layers: [
      shadow({
        color: "rgba(0,0,0,0.45)",
        offset: [8, 10],
        blur: 6,
        stroke: 22,
      }),
      stroke(22, "#14206b", { id: "edge" }),
      stroke(12, "#ffffff"),
      fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"]), { id: "face" }),
    ],
  },
};
```

## Punchline (ツッコミ)

A heavy display face, slightly condensed, with a red edge and tilted glyphs for energy.

```ts demo
import { fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "なんでやねん！",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 96,
    scaleX: 0.9,
    letterSpacing: 8,
    layers: [
      shadow({
        color: "rgba(80,0,0,0.5)",
        offset: [6, 8],
        blur: 4,
        stroke: 18,
      }),
      stroke(18, "#ffffff"),
      stroke(10, "#d7001b"),
      fill(linearGradient(["#ffffff", "#ffd6d6"], { scope: "glyph" })),
    ],
  },
  glyphTransform: (glyph) => ({
    rotation: [-6, 4, -3, 5, -4, 3, -8][glyph.index % 7],
    y: glyph.index % 2 ? 4 : -4,
  }),
};
```

## Cute glow

Rounded type, a soft pink glow and a small annotation in the same palette.

```ts demo
import { fill, glow, parseMarkup, stroke } from "tellu";

export default {
  text: parseMarkup("かわいすぎる…！<br/><note>※スタッフ一同メロメロ</note>", {
    note: {
      fontSize: 30,
      layers: [
        glow({ color: "#ff8fd3", stroke: 6, blur: 8 }),
        stroke(6, "#ffffff"),
        stroke(3, "#ff5fae"),
        fill("#ffffff"),
      ],
    },
  }),
  align: "center",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 76,
    lineHeight: 1.4,
    layers: [
      glow({ color: "#ff8fd3", stroke: 16, blur: 16 }),
      stroke(14, "#ffffff"),
      stroke(7, "#ff5fae"),
      fill("#ffffff"),
    ],
  },
};
```

## Inner voice (心の声)

Quiet, slanted and translucent: a skew transform plus a low-contrast palette.

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "（え、今のって…まさか？）",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 700,
    fontSize: 52,
    letterSpacing: 2,
    layers: [stroke(8, "rgba(20,30,60,0.75)"), fill("#dbe7ff")],
  },
  glyphTransform: () => ({ skewX: -12, opacity: 0.92 }),
};
```

## Impact pop (ドーン)

The caption slams in from a large scale and settles with a small overshoot.

```ts demo loop=60 still=40
import {
  fill,
  linearGradient,
  shadow,
  stroke,
  type TextNodeProps,
} from "tellu";

const overshoot = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

export default (frame: number): TextNodeProps => ({
  text: "ドーン！",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 120,
    layers: [
      shadow({ offset: [0, 12], blur: 0, stroke: 22, color: "#3a0a00" }),
      stroke(22, "#3a0a00"),
      stroke(12, "#ffd43b"),
      fill(linearGradient(["#ffffff", "#ffe066"])),
    ],
  },
  glyphTransform: (glyph) => {
    const t = Math.min(1, Math.max(0, (frame - glyph.index * 3) / 10));
    if (t === 0) return { visible: false };
    return {
      scale: 2.4 - 1.4 * overshoot(t),
      rotation: (1 - t) * (glyph.index % 2 ? 20 : -20),
    };
  },
});
```

## Gold lettering (金文字)

A metallic gradient fill lit by a chisel bevel, inside a dark and a white outline.

```ts demo
import { bevel, fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "祝・優勝！",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 96,
    layers: [
      shadow({ offset: [6, 8], blur: 6, stroke: 20 }),
      stroke(20, "#ffffff"),
      stroke(12, "#5a3200"),
      fill(linearGradient(["#fffbe0", "#ffd84a", "#c88a10", "#ffe27a"])),
      ...bevel({ size: 6, technique: "chisel" }),
    ],
  },
};
```

## Quiz answer

The reveal of a quiz answer: a red and a white outline around a gold fill split hard at the middle, like a metal plate.

```ts demo
import { fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "富士山",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 88,
    letterSpacing: 10,
    layers: [
      shadow({ offset: [0, 8], blur: 8, stroke: 18 }),
      stroke(18, "#b80000"),
      stroke(9, "#ffffff"),
      fill(
        linearGradient([
          [0, "#fff9db"],
          [0.5, "#ffe066"],
          [0.5, "#ffc300"],
          [1, "#ff8f00"],
        ]),
      ),
    ],
  },
};
```
