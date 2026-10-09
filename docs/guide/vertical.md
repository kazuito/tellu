---
description: Vertical writing (縦書き) with writingMode, glyph orientation, 縦中横 (textCombineUpright), wrapping by maxHeight, alignment and plates in vertical text.
---

# Vertical writing

Set `writingMode: "vertical-rl"` and text runs top to bottom, with lines stacked right to left: the 縦書き of Japanese TV titles, drama captions and posters. Every other feature works the same way, including layers, gradients, rich text, kinsoku, plates and glyph transforms.

```ts demo
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tellu";

export default {
  text: parseMarkup("<em>第3話</em><br/>消えた<red>ラーメン</red>の謎", {
    em: { fontSize: 44, layers: { 3: { paint: "#ffe600" } } },
    red: {
      layers: {
        3: {
          paint: linearGradient(["#ff8a80", "#e60012"], { scope: "glyph" }),
        },
      },
    },
  }),
  writingMode: "vertical-rl",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    lineHeight: 1.3,
    layers: [
      shadow({
        color: "rgba(0,0,0,0.55)",
        offset: [8, 10],
        blur: 6,
        stroke: 20,
      }),
      stroke(20, "#1b2a7a"),
      stroke(10, "#ffffff"),
      fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"])),
    ],
  },
  background: { paint: "rgba(0, 20, 40, 0.6)", radius: 12 },
};
```

| `writingMode` | Lines run | Lines stack |
| --- | --- | --- |
| `"horizontal-tb"` (default) | Left → right | Top → bottom |
| `"vertical-rl"` | Top → bottom | Right → left |
| `"vertical-lr"` | Top → bottom | Left → right |

The names and behavior follow CSS `writing-mode`.

## Glyph orientation

In vertical text, each character is either set **upright** or turned **sideways** (90° clockwise). `textOrientation` picks the rule, as in CSS:

| `textOrientation` | |
| --- | --- |
| `"mixed"` (default) | Japanese, Chinese and Korean upright, Latin letters and digits sideways |
| `"upright"` | Every character upright |
| `"sideways"` | Every character sideways, like horizontal text turned 90° clockwise |

```ts demo compare
import { fill, stroke, type TextOrientation } from "tellu";

const props = (textOrientation: TextOrientation) => ({
  text: "tellu v2で縦書きOK",
  writingMode: "vertical-rl" as const,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 40,
    textOrientation,
    layers: [stroke(6, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
});

export default {
  mixed: props("mixed"),
  upright: props("upright"),
  sideways: props("sideways"),
};
```

Whatever the setting, a few characters always get their vertical forms:

- Brackets, long dashes, ー and 〜 are turned sideways, so 「」 open downward and ー runs along the line.
- 、 and 。 move to the top right of their cell, and small kana (ッ, ゃ, …) shift toward the top right.

## 縦中横 (tate-chū-yoko)

Short numbers read better set horizontally inside a single upright cell. `textCombineUpright` does this, condensing the group to fit one em:

| `textCombineUpright` | Combines |
| --- | --- |
| `"digits 2"` (default) | Runs of up to 2 ASCII digits (`"digits"` is the same) |
| `"digits 3"`, `"digits 4"` | Runs of up to 3 or 4 digits |
| `"all"` | Each run of text with this style, whatever it contains |
| `"none"` | Nothing |

Runs of more digits than the limit are set by `textOrientation` instead. To combine something other than digits, such as `!?` or `100%`, give it its own style with `"all"`. Markup makes that easy:

```ts demo compare
import { fill, parseMarkup, stroke } from "tellu";

const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 40,
  layers: [stroke(6, "#111"), fill("#fff")],
};
const guide = { paint: "rgba(255,255,255,0.1)", padding: 0 };

export default {
  '"digits 2" (default)': {
    text: "全12話　2026年",
    writingMode: "vertical-rl",
    style,
    background: guide,
  },
  '"digits 4"': {
    text: "全12話　2026年",
    writingMode: "vertical-rl",
    style: { ...style, textCombineUpright: "digits 4" },
    background: guide,
  },
  '"all" via markup': {
    text: parseMarkup("本当に<tcy>!?</tcy>　<tcy>100%</tcy>", {
      tcy: { textCombineUpright: "all" },
    }),
    writingMode: "vertical-rl",
    style,
    background: guide,
  },
};
```

## Wrapping and alignment

In vertical text the line length is the **height**, so `maxHeight` wraps lines just as `maxWidth` does in horizontal text. Kinsoku, hanging punctuation and phrase breaking all apply.

`align` works along the line: `"start"` is the top, `"end"` the bottom. (`"top"` and `"bottom"` are accepted as aliases, as are `"left"` and `"right"`.)

```ts demo compare
import { fill, stroke, type TextAlign } from "tellu";

const props = (align: TextAlign) => ({
  text: "「さあ、始めましょう。」ちょっと待って……まだ準備中です！",
  writingMode: "vertical-rl" as const,
  maxHeight: 260,
  align,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 32,
    lineHeight: 1.4,
    layers: [stroke(5, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
});

export default {
  start: props("start"),
  center: props("center"),
  end: props("end"),
  justify: props("justify"),
  "justify-all": props("justify-all"),
};
```

## Fitting

`overflow` works along the line too: `"squeeze"` condenses overflowing lines *vertically*, and `"shrink"` scales the font until the text fits. In vertical text, `maxWidth` bounds how wide the stack of lines may grow, so `shrink` can fit text into a box:

```ts demo compare
import { fill, stroke } from "tellu";

const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 44,
  layers: [stroke(6, "#111"), fill("#fff")],
};
const guide = { paint: "rgba(255,255,255,0.1)", padding: 0 };

export default {
  "vertical-lr": {
    text: "左から右へ\n行が進みます",
    writingMode: "vertical-lr",
    style,
    background: guide,
  },
  "shrink to 160 × 240": {
    text: "長い縦書きテロップも枠に収まるまで縮小します",
    writingMode: "vertical-rl",
    maxWidth: 160,
    maxHeight: 240,
    overflow: "shrink",
    style,
    background: guide,
  },
};
```

## Details

- **Baseline shift** moves glyphs to the right in vertical text.
- **Letter spacing** adds space below each character.
- **Plates** default to a padding of 24 along the lines and 12 across them, so the default is `[12, 24]` in vertical text. A `[x, y]` padding is always physical.
- **Kerning** applies only between neighbouring sideways glyphs, such as Latin words.
- **Paint scopes**: `"line"` is a column. `angle: 180` still runs top to bottom on screen.
- **Glyph transforms** stay in screen space: `y` moves a glyph down, whatever the writing mode. `glyph.x/y/width/height` is the glyph's cell on screen.

::: info Vertical forms are approximated
Canvas 2D can't ask a font for its vertical glyph alternates (the OpenType `vert` feature). tellu rotates brackets and dashes and moves punctuation and small kana by their ink, which matches Chrome's CSS rendering closely for typical Japanese fonts. Glyphs with vertical forms that differ more, like some symbols, keep their horizontal shapes.
:::
