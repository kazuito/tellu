---
description: Variety-show captions to copy, including the classic gradient telop, punchline, cute glow, inner voice, impact pop and quiz reveal.
---

# Variety shows

The loud, layered captions of Japanese variety TV, the look tellu was built for. Every example is complete: copy it, swap the text, done.

## Classic telop

Navy and white outlines, a shadow cast by the whole outline, a warm gradient fill, and an emphasized word that patches two layers.

```ts demo backdrop=scene
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tellu";

export default {
  text: parseMarkup("今日は<em>最高</em>の一日！", {
    em: {
      fontSize: 104,
      layers: {
        edge: { paint: "#8a0036" },
        face: { paint: linearGradient(["#ffffff", "#ffb3d1", "#ff2e7e"]) },
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
      fill(linearGradient(["#fffbd1", "#ffe14d", "#ff9d00"]), { id: "face" }),
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

```ts demo backdrop=studio
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

```ts demo backdrop=street
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

## Quiz question and answer

A question on a plate, then the answer in a contrasting style. The two are separate captions placed on top of each other in your scene.

```ts demo compare backdrop=studio
import { fill, linearGradient, shadow, stroke } from "tellu";

export default {
  question: {
    text: "Q. 日本一高い山は？",
    style: {
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 48,
      layers: [fill("#ffffff")],
    },
    background: {
      paint: linearGradient(["#1c3faa", "#0b1f5c"]),
      padding: [32, 16],
      radius: 12,
      stroke: { width: 4, paint: "#7fd1ff" },
    },
  },
  answer: {
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
  },
};
```
