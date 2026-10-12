---
description: Bend captions like Photoshop's warp text with warp, using styles such as arc, bulge, flag and fisheye with a bend and distortions, or a free-form envelope of 16 points, while outlines keep an even width.
---

# Warp

`warp` bends the glyphs, like Photoshop's warp text. Pick a `style` and a `bend` from `-1` to `1`:

```ts demo
import { fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "大逆転サヨナラ勝ち",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 64,
    layers: [
      shadow({ offset: [5, 6], blur: 3, stroke: 16 }),
      stroke(16, "#2b0a3d"),
      stroke(8, "#ffffff"),
      fill(linearGradient(["#ffe600", "#ff6a00"])),
    ],
  },
  warp: { style: "arc", bend: 0.4 },
};
```

The glyphs are bent first and outlined afterwards, so the outlines keep an even width however strong the warp is. Shadows, shading and gradients all apply to the bent glyphs.

## Styles

```ts demo compare
import { fill, stroke, type TextNodeProps, type WarpStyle } from "tellu";

const sample = (style: WarpStyle): TextNodeProps => ({
  text: "ワープテロップ",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 40,
    layers: [stroke(8, "#1b1b3a"), fill("#ffd400")],
  },
  warp: { style, bend: 0.5 },
});

export default {
  arc: sample("arc"),
  "arc-lower": sample("arc-lower"),
  "arc-upper": sample("arc-upper"),
  arch: sample("arch"),
  bulge: sample("bulge"),
  flag: sample("flag"),
  wave: sample("wave"),
  rise: sample("rise"),
  fisheye: sample("fisheye"),
  inflate: sample("inflate"),
  squeeze: sample("squeeze"),
  twist: sample("twist"),
};
```

| Style | |
| --- | --- |
| `arc` | Bends the text into part of a ring, keeping the length of its middle line: half a circle at `bend: 1` |
| `arc-lower`, `arc-upper` | Bows only the bottom or only the top edge |
| `arch` | Lifts the text along a curve, keeping its height |
| `bulge` | Makes the middle taller, bowing both edges out |
| `flag`, `wave` | One or two waves along the line |
| `rise` | Rises from left to right along an S curve |
| `fisheye` | Magnifies the middle like a lens, the same in every direction |
| `inflate` | Swells the middle in both directions |
| `squeeze` | Pinches the middle of the line |
| `twist` | Turns the middle, less toward the corners |

The styles are named after Photoshop's and work in the same spirit, but their exact shapes differ. A negative `bend` bends the other way: an `arc` that sags, a `bulge` that pinches. No style folds the text over itself, at any bend.

`direction: "vertical"` bends along the height instead of the width, which suits [vertical text](./vertical). `horizontalDistortion` and `verticalDistortion` (`-1` to `1`) add a perspective: a positive horizontal distortion makes the left side taller and the right side shorter, and a positive vertical distortion makes the top wider:

```ts demo compare
import { fill, stroke, type TextNodeProps } from "tellu";

const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 48,
  layers: [stroke(8, "#1b1b3a"), fill("#ffffff")],
};

export default {
  "horizontalDistortion: 0.6": {
    text: "迫りくる",
    style,
    warp: { style: "flag", bend: 0, horizontalDistortion: 0.6 },
  },
  "vertical bulge": {
    text: "縦書き",
    writingMode: "vertical-rl",
    style,
    warp: { style: "bulge", bend: 0.5, direction: "vertical" },
  },
} satisfies Record<string, TextNodeProps>;
```

## Envelopes

For any other shape, give an `envelope` of 16 control points. The box around the text becomes a bicubic Bézier patch, the way Photoshop's custom warp does. The points are fractions of the box, `[0, 0]` its top left and `[1, 1]` its bottom right, in 4 rows of 4 from the top left. An unwarped box has its points at `[column / 3, row / 3]`:

```ts demo
import { fill, stroke } from "tellu";

const t = 1 / 3;
const u = 2 / 3;

export default {
  text: "どんどん大きく",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [stroke(10, "#003049"), fill("#ffffff")],
  },
  // The left edge shrinks to the middle third, the right edge grows past the box.
  warp: {
    envelope: [
      [0, t],
      [t, 0.2],
      [u, 0],
      [1, -0.2],
      [0, 0.45],
      [t, t],
      [u, t],
      [1, t],
      [0, 0.55],
      [t, u],
      [u, u],
      [1, u],
      [0, u],
      [t, 0.8],
      [u, 1],
      [1, 1.2],
    ],
  },
};
```

## Details

- The warp spans the text's content: the bounds of its lines' content boxes. Each point of the text moves by where it sits in that box, so the same warp looks different on a short word and a long line.
- Gradients and patterns are stretched over the bent glyphs, so a line gradient still runs from the top of the bent text to its bottom.
- [Glyph transforms](./animation) apply on top: each glyph moves around the point its `origin` was bent to. [Underlines and other lines](./decorations#lines) bend with the text.
- [Plates](./plates) and [box decorations](./decorations#markers-and-highlights) aren't warped, and the layout box keeps its unwarped size, so `<Text>` sizes its element by the unwarped text. Bent glyphs paint outside it like outlines do.
- Bending is done per pixel on the CPU, so a warped caption takes longer to draw the first time, a few hundred milliseconds for a short line. Changing `warp` rebuilds the caption: animate warps sparingly.
- Bent outlines always use round joins, like non-uniform scaling.
