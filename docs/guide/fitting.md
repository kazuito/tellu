---
description: Make text fit a fixed box by shrinking the font size or condensing overflowing lines (長体で収める), with maxWidth, maxHeight and maxLines.
---

# Fitting text

Captions often have a fixed slot: a lower-third bar, a 2-line subtitle area, a price tag. tixi can make text fit instead of overflowing.

## Overflow

`overflow` decides what happens when text is wider than `maxWidth`:

| `overflow` | Behavior |
| --- | --- |
| `"visible"` (default) | Lines may run past `maxWidth` |
| `"shrink"` | The whole caption is scaled down until every line fits `maxWidth`, and the block fits `maxHeight` and `maxLines` |
| `"squeeze"` | Each line that overflows is condensed horizontally to fit (長体で収める) |

```ts demo compare
import { fill, type Overflow, stroke } from "tixi";

const props = (overflow: Overflow) => ({
  text: "とても長いタイトルでも一行に収める",
  maxWidth: 420,
  wrap: "none" as const,
  overflow,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    layers: [stroke(8, "#000"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
});

export default {
  'overflow: "visible"': props("visible"),
  'overflow: "shrink"': props("shrink"),
  'overflow: "squeeze"': props("squeeze"),
};
```

`wrap: "none"` keeps each caption on one line, so the only way to fit is to shrink or squeeze.

### Shrink

`"shrink"` binary-searches the largest font scale at which everything fits. It scales the font size, letter spacing and line height together (except a line height given in `{ px }`). Layer stroke widths stay as they are, so outlines look relatively bolder on shrunken text. The applied scale is exposed as `layout.fontScale`.

Combined with wrapping and `maxLines`, it fits text into a box of N lines:

```ts demo
import { fill, stroke } from "tixi";

export default {
  text: "長い説明文でも二行以内に収まるように、フォントサイズを自動で小さくして調整します",
  maxWidth: 560,
  maxLines: 2,
  overflow: "shrink",
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [stroke(7, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
};
```

### Squeeze

`"squeeze"` condenses only the lines that overflow, and the rest keep their natural width. Glyphs are condensed like [`scaleX`](./typography#condensed-and-expanded-glyphs), with outlines that stay even. It is the standard way to fit names and titles into a fixed bar.

### Fitting a box

`maxHeight` bounds the height of the whole caption, but only for `shrink`: it never wraps or truncates horizontal text. Together with `maxWidth`, it makes `shrink` fit a box of any shape:

```ts demo
import { fill, stroke } from "tixi";

export default {
  text: "どれだけ長い文章でも、指定した幅と高さの枠に収まるまでフォントサイズを小さくします",
  maxWidth: 420,
  maxHeight: 130,
  overflow: "shrink",
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [stroke(7, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
};
```

In [vertical text](./vertical#fitting) the roles swap: `maxHeight` is the line length and `maxWidth` bounds the stack of lines.

### Minimum scale

`minScale` (default `0.3`) is the smallest scale `shrink` or `squeeze` may apply. Past that, text overflows instead of becoming unreadable.

## Limiting lines

`maxLines` without `shrink` simply **truncates**: lines after the limit are dropped. With `shrink`, it is a constraint the font scale must satisfy instead.

::: tip Pick the right tool
- A name in a fixed bar: `wrap: "none"` + `overflow: "squeeze"`
- A headline that must stay on one line: `wrap: "none"` + `overflow: "shrink"`
- A subtitle area of at most two lines: `maxLines: 2` + `overflow: "shrink"`
:::
