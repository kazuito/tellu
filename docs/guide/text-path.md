---
description: Set captions along arcs and SVG paths with textPath and arcPath, with alignment, fitting to the path's length, several lines, and glyph transforms.
---

# Text on a path

`textPath` sets the lines along a path instead of straight. `arcPath()` builds a circular one, the arched title of variety shows:

```ts demo
import { arcPath, fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: "今夜は特別編",
  textPath: arcPath(320, { sweep: 120 }),
  align: "center",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 72,
    layers: [
      shadow({ offset: [5, 6], blur: 3, stroke: 16 }),
      stroke(16, "#2b0a3d"),
      stroke(8, "#ffffff"),
      fill(linearGradient(["#ffe600", "#ff6a00"], { angle: 90 })),
    ],
  },
};
```

Each glyph keeps its place along the line as a distance along the path, and turns with the path there. Outlines, shadows and gradients work as on straight text: neighbouring outlines still merge, and gradients stay upright on screen.

## Arcs

```ts
arcPath(radius, { center?, sweep?, direction?, startOffset?, side? })
```

An arc of a circle of `radius` px. `sweep` is how much of the circle it spans in degrees (default `360`), and `center` is where its middle is, in degrees clockwise from the top (default `0`). By default the text runs clockwise, over the top of the circle. For text along the bottom that reads left to right, run it counterclockwise around a center of `180`:

```ts demo compare
import { arcPath, fill, stroke, type TextNodeProps } from "tellu";

const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 44,
  layers: [stroke(10, "#1b1b3a"), fill("#ffffff")],
};

export default {
  top: {
    text: "上はそのまま",
    textPath: arcPath(200, { sweep: 120 }),
    align: "center",
    style,
  },
  bottom: {
    text: "下は反時計回り",
    textPath: arcPath(200, {
      center: 180,
      sweep: 120,
      direction: "counterclockwise",
    }),
    align: "center",
    style,
  },
} satisfies Record<string, TextNodeProps>;
```

## Any path

`d` takes SVG path data in px (`M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A` and `Z`, absolute or relative). Only its first subpath is used:

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "なみなみ揺れるテロップ",
  textPath: { d: "M0 60 C120 -20 220 140 340 60 S560 -20 680 60" },
  align: "center",
  style: {
    fontFamily: "RocknRoll One",
    fontSize: 52,
    layers: [stroke(12, "#003049"), fill("#9bf6ff")],
  },
};
```

The glyphs stand on the left of the direction the path runs: above a path drawn left to right. `side: "right"` walks the path backward, which puts them on the other side. `startOffset` moves the start of the line along the path, in px or `{ em }`.

## Alignment and fitting

The path's length is the line length, unless `maxWidth` is set. So `align: "center"` centers the text on the path, and [`overflow: "shrink"`](./fitting) with `maxLines: 1` scales the font until the text fits on it:

```ts demo
import { arcPath, fill, stroke } from "tellu";

export default {
  text: "どんなに長いタイトルでも弧に収まります",
  textPath: arcPath(240, { sweep: 110 }),
  align: "center",
  overflow: "shrink",
  maxLines: 1,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 64,
    layers: [stroke(10, "#7b2cbf"), fill("#ffffff")],
  },
};
```

Text longer than the path wraps. The first line sits on the path, and every later line follows it at its distance from the first, like the rings of a target:

```ts demo
import { arcPath, fill, stroke } from "tellu";

export default {
  text: "二行目も\n曲線に沿う",
  textPath: arcPath(200, { sweep: 120 }),
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 48,
    lineHeight: 1.3,
    layers: [stroke(10, "#e63946"), fill("#ffffff")],
  },
};
```

## Animation

[Glyph transforms](./animation) work on top of the path. A glyph's `angle` in the [`GlyphContext`](/api/types#glyphcontext) is the path's direction there, and `origin` turns with the glyph, so `[0.5, 1]` is still the bottom of the glyph. `x`, `y` and `rotation` stay in screen space:

```ts demo loop=60 still=20
import { arcPath, fill, stroke, type TextNodeProps } from "tellu";

export default (frame: number): TextNodeProps => ({
  text: "ぴょこぴょこアーチ",
  textPath: arcPath(260, { sweep: 130 }),
  align: "center",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 56,
    layers: [stroke(12, "#ff006e"), fill("#ffffff")],
  },
  glyphTransform: (glyph) => {
    const phase = (frame / 60) * Math.PI * 2 - glyph.index * 0.7;
    return { scale: 1 + Math.max(0, Math.sin(phase)) * 0.3, origin: [0.5, 1] };
  },
});
```

Changing the path itself rebuilds the caption, like any change other than `glyphTransform`.

## Details

- The layout box is the bounds of the placed glyph cells, moved to the origin, so `<Text>` and `anchor` size and place the arc as a whole. Each line's `contentBox` is the bounds of its own glyphs, which is what [plates](./plates) are drawn around.
- `layout.glyphs` report the turned glyphs: `angle` is the rotation, and `box` is the unturned cell, centered where the turned cell is.
- Only horizontal text can follow a path: vertical text with `textPath` throws.
- [Decorations](./decorations) aren't drawn along paths.
- Glyphs are rasterized already turned, so they stay sharp. Each angle is its own bitmap, so long text on a curve caches more bitmaps than straight text.
