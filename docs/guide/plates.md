---
description: Background plates (座布団) behind the whole caption or behind each line, with padding, radius, outline, paint, blur and opacity.
---

# Background plates

A plate (座布団, "cushion") is a box behind the text that keeps it readable over busy footage. Set it with `background`:

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "長いテロップは幅に合わせて自動で折り返されます。句読点や「かぎかっこ」にも配慮しています。",
  maxWidth: 560,
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 34,
    lineHeight: 1.5,
    layers: [stroke(6, "#003049"), fill("#ffffff")],
  },
  background: { paint: "rgba(0, 20, 40, 0.72)", padding: [28, 14], radius: 14 },
};
```

The plate hugs the text's content box, the ink-relevant extent of the lines, plus `padding`.

## One plate per line

`mode: "line"` gives each line its own plate, sized to that line. This is the classic subtitle and news-super look:

```ts demo
import { fill, linearGradient } from "tellu";

export default {
  text: "今夜9時から\n特別番組を放送します",
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 44,
    lineHeight: 1.7,
    layers: [fill("#ffffff")],
  },
  background: {
    mode: "line",
    paint: linearGradient(["#0b3d91", "#1e88e5"], { angle: 90 }),
    padding: [22, 6],
    radius: 6,
    stroke: { width: 3, paint: "#ffffff" },
  },
};
```

Leave room between lines with `lineHeight`, or the plates will touch.

## Pill labels

A large `radius` is clamped to half the plate's height, which turns any plate into a pill:

```ts demo compare
import { fill } from "tellu";

const label = (text: string, paint: string) => ({
  text,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 30,
    layers: [fill("#111111")],
  },
  background: { paint, padding: [18, 6] as const, radius: 999 },
});

export default {
  "speaker A": label("ずんだ", "#ffd400"),
  "speaker B": label("めたん", "#4ad6ff"),
  "a tag": label("#新商品", "#ff8fd3"),
};
```

## Slanted plates

`skew` slants a plate into a parallelogram, in degrees. Its top edge moves toward the end of the lines (its right edge, in vertical text), which is the look of many news and sports supers:

```ts demo
import { fill } from "tellu";

export default {
  text: "決勝進出",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [fill("#ffffff")],
  },
  background: {
    paint: "#e60033",
    padding: [44, 12],
    skew: -15,
    stroke: { width: 4, paint: "#ffffff" },
  },
};
```

The slant comes on top of the padding, so the text keeps the same space on both sides at its middle.

## Soft edges

Plates take `offset`, `blur`, `opacity` and PixiJS `filters` like a layer does. A little blur softens the edges:

```ts demo
import { fill } from "tellu";

export default {
  text: "ふんわり座布団",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 56,
    layers: [fill("#3a2a1a")],
  },
  background: {
    paint: "rgba(255, 250, 235, 0.85)",
    padding: [32, 14],
    radius: 999,
    blur: 2,
  },
};
```

## Options

| Option | Default | |
| --- | --- | --- |
| `paint` | | Any [paint](./paint). Gradients span the plate (or each line plate) |
| `padding` | `[24, 12]` | `[x, y]` or one number for both. In vertical text the default is `[12, 24]` |
| `radius` | `0` | Corner radius, clamped to half the plate's size |
| `skew` | `0` | Slant in degrees |
| `stroke` | | `{ width, paint }` |
| `mode` | `"block"` | `"line"` draws one plate per line |
| `offset` | `[0, 0]` | |
| `blur` | `0` | |
| `opacity` | `1` | |
| `filters` | | PixiJS filters |

Plates add nothing to the layout box: `<Text>` keeps the size of the text itself, and the plate paints outside it like an outline does. See [`PlateStyle`](/api/types#platestyle).
