---
description: Font family, size, weight and style, letter spacing, tsume (文字ツメ), condensed and expanded glyphs (長体 / 平体) with uniform outlines, line height, kerning and baseline shift.
---

# Typography

Everything in `style` other than `layers` controls the type itself.

| Option | Default | |
| --- | --- | --- |
| `fontFamily` | `"sans-serif"` | A family name, a CSS family list, or an array |
| `fontSize` | `64` | px |
| `fontWeight` | `"normal"` | `100`–`900`, `"bold"`, … |
| `fontStyle` | `"normal"` | `"italic"`, `"oblique"` |
| `letterSpacing` | `0` | px, or `{ em }` |
| `tsume` | `0` | `0`–`1`: tightens Japanese and Chinese characters by their blank space (文字ツメ) |
| `scaleX` / `scaleY` | `1` | Condensed / expanded glyphs |
| `lineHeight` | `1.2` | A multiple of the font size, or `{ px }` |
| `kerning` | `true` | |
| `baselineShift` | `0` | px, or `{ em }`. Positive values raise the text (move it right in vertical text) |
| `textOrientation` | `"mixed"` | Vertical text only. See [Vertical writing](./vertical#glyph-orientation) |
| `textCombineUpright` | `"digits 2"` | Vertical text only: 縦中横. See [Vertical writing](./vertical#縦中横-tate-chu-yoko) |

## Letter spacing

`letterSpacing` adds space after each character, in px or relative to the font size with `{ em }`. Em units keep the rhythm when the font size changes, for example under [`overflow: "shrink"`](./fitting).

```ts demo compare
import { fill, stroke } from "tellu";

const style = (letterSpacing: number | { em: number }) => ({
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 48,
  letterSpacing,
  layers: [stroke(7, "#111"), fill("#fff")],
});

export default {
  "-4": { text: "字間の調整", style: style(-4) },
  "0": { text: "字間の調整", style: style(0) },
  "{ em: 0.2 }": { text: "字間の調整", style: style({ em: 0.2 }) },
};
```

## Tsume (文字ツメ)

Kana and fullwidth punctuation sit in the middle of an em square, so Japanese text set solid looks loose next to its kanji. `tsume` removes that fraction of the blank space on both sides of each character, like 文字ツメ in Photoshop and Premiere Pro. `1` sets the characters ink to ink, which is very tight under thick outlines; values between `0.3` and `0.5` keep some air.

```ts demo compare
import { fill, stroke } from "tellu";

const style = (tsume: number) => ({
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 48,
  tsume,
  layers: [stroke(7, "#111"), fill("#fff")],
});

export default {
  "tsume: 0": { text: "ちょっとしたコツ。", style: style(0) },
  "tsume: 0.5": { text: "ちょっとしたコツ。", style: style(0.5) },
  "tsume: 1": { text: "ちょっとしたコツ。", style: style(1) },
};
```

Unlike a negative `letterSpacing`, which moves every character by the same amount, `tsume` follows each glyph's ink: っ and 。 close up far more than し or た. Only kana, kanji and fullwidth punctuation are tightened; Latin text, digits and spaces keep their spacing, and so does 縦中横. In [vertical text](./vertical) the space above and below each upright character is removed.

`tsume` measures ink with [`Measurer.inkBounds()`](/api/layout#measurer), which the default measurer provides; with a custom measurer that lacks it, `tsume` has no effect. It adds to `letterSpacing` and kerning, and can differ per run in [rich text](./rich-text).

## Condensed and expanded glyphs

Japanese typesetting squeezes glyphs horizontally (長体, condensed) or vertically (平体, flattened) to fit a design. `scaleX` and `scaleY` do this **without distorting the outlines**: a 16 px outline stays 16 px on every side.

```ts demo compare
import { fill, stroke } from "tellu";

const style = (scaleX: number, scaleY = 1) => ({
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 72,
  scaleX,
  scaleY,
  layers: [stroke(16, "#2a0845"), stroke(8, "#f9d423"), fill("#ffffff")],
});

export default {
  "scaleX: 0.7": { text: "長体ABC", style: style(0.7) },
  "scaleX: 1": { text: "正体ABC", style: style(1) },
  "scaleY: 0.75": { text: "平体ABC", style: style(1, 0.75) },
};
```

Scaling a canvas or CSS element squashes the outline along with the glyph. tellu scales the glyph shape and then grows the outline from a distance field, so the width stays even.

## Line height

`lineHeight` is a multiple of the font size (`1.2` by default) or an absolute `{ px }`. Each line takes the tallest line height among its runs, and the text sits centred in that line box.

```ts demo compare
import { fill, stroke } from "tellu";

const props = (lineHeight: number | { px: number }) => ({
  text: "一行目\n二行目",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 40,
    lineHeight,
    layers: [stroke(6, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.12)", padding: 0 },
});

export default {
  "1": props(1),
  "1.2 (default)": props(1.2),
  "1.8": props(1.8),
  "{ px: 64 }": props({ px: 64 }),
};
```

## Kerning

tellu applies the font's kerning by default. Each glyph is still drawn separately, so it can be outlined and animated on its own. Set `kerning: false` for even, monospaced-feeling spacing:

```ts demo compare
import { fill, stroke } from "tellu";

const style = (kerning: boolean) => ({
  fontFamily: "Montserrat",
  fontWeight: 900,
  fontSize: 56,
  kerning,
  layers: [stroke(8, "#111"), fill("#fff")],
});

export default {
  "kerning: true": { text: "AVATAR WAVE", style: style(true) },
  "kerning: false": { text: "AVATAR WAVE", style: style(false) },
};
```

## Baseline shift

`baselineShift` raises a run (or lowers it, if negative) relative to the baseline. It is most useful in [rich text](./rich-text) for small annotations:

```ts demo
import { fill, parseMarkup, stroke } from "tellu";

export default {
  text: parseMarkup("新商品<note>※個人の感想です</note>", {
    note: {
      fontSize: 24,
      fontWeight: 400,
      baselineShift: { em: 1.4 },
      layers: [stroke(4, "#111"), fill("#fff")],
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [stroke(10, "#111"), fill("#fff")],
  },
};
```

## Mixed fonts

Fonts can change mid-caption through rich text. Lines align on a shared baseline, so mixing families and sizes just works:

```ts demo
import { fill, parseMarkup, stroke } from "tellu";

export default {
  text: parseMarkup("<tag>【速報】</tag>新商品<big>ついに</big>発売", {
    tag: {
      fontFamily: "Dela Gothic One",
      fontWeight: 400,
      layers: { 1: { paint: "#ffe600" } },
    },
    big: {
      fontSize: 88,
      letterSpacing: { em: 0.06 },
      layers: { 1: { paint: "#ff3b30" } },
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 60,
    layers: [stroke(10, "#111"), fill("#fff")],
  },
};
```
