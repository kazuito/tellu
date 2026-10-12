---
description: Solid colors, linear (including reflected), radial, conic and diamond gradients, and image patterns, plus the paint scope that decides whether a gradient spans each glyph, each line or the whole block.
---

# Paint

Every layer's `paint` is one of:

- a **color**: any CSS color string (`"#ffd000"`, `"rgba(0,0,0,0.5)"`, `"tomato"`) or a number (`0xffd000`);
- a **linear gradient**, made with `linearGradient()`, optionally [reflected](#reflected-gradients);
- a **radial gradient**, made with `radialGradient()`;
- a **conic gradient**, made with `conicGradient()`;
- a **diamond gradient**, made with `diamondGradient()`;
- a **pattern** that tiles an image or canvas.

## Linear gradients

```ts
linearGradient(stops, { angle?, scope? })
```

`stops` is a list of colors, spread evenly from 0 to 1, or a list of `[offset, color]` pairs. `angle` follows CSS `linear-gradient`: `180` (the default) runs top to bottom and `90` runs left to right.

```ts demo compare
import { fill, linearGradient, stroke } from "tellu";

const style = (paint: ReturnType<typeof linearGradient>) => ({
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 64,
  layers: [stroke(10, "#1b2a7a"), fill(paint)],
});

export default {
  "evenly spaced": {
    text: "グラデ",
    style: style(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"])),
  },
  "angle: 90": {
    text: "グラデ",
    style: style(linearGradient(["#4cc9f0", "#f72585"], { angle: 90 })),
  },
  "hard stops": {
    text: "グラデ",
    style: style(
      linearGradient([
        [0, "#ffffff"],
        [0.5, "#ffffff"],
        [0.5, "#ffd43b"],
        [1, "#ff922b"],
      ]),
    ),
  },
};
```

The hard-stops variant (two stops at the same offset) is the classic two-tone variety-show fill.

## Paint scope

A gradient has to be stretched over *some* box, and `scope` picks which one:

| `scope` | The gradient spans | Default for |
| --- | --- | --- |
| `"glyph"` | Each character's em box | |
| `"line"` | Each line's content box | Gradients |
| `"block"` | The whole text block | Patterns |

```ts demo compare
import { fill, linearGradient, stroke, type PaintScope } from "tellu";

const style = (scope: PaintScope) => ({
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 52,
  lineHeight: 1.15,
  layers: [
    stroke(8, "#111"),
    fill(linearGradient(["#ff006e", "#ffbe0b"], { angle: 90, scope })),
  ],
});

export default {
  'scope: "glyph"': { text: "色がわり\nテロップ", style: style("glyph") },
  'scope: "line"': { text: "色がわり\nテロップ", style: style("line") },
  'scope: "block"': { text: "色がわり\nテロップ", style: style("block") },
};
```

Scope applies to outlines too. A gradient *outline* with `scope: "block"` runs smoothly around the whole caption.

## Radial gradients

```ts
radialGradient(stops, { center?, radius?, scope? })
```

`center` is relative to the scope box (`[0.5, 0.5]` is the middle). `radius` is a factor of the distance to the box's farthest corner, with a default of `1`.

```ts demo
import { fill, glow, radialGradient } from "tellu";

export default {
  text: "GLOW",
  style: {
    fontFamily: "Montserrat",
    fontWeight: 900,
    fontSize: 110,
    letterSpacing: 6,
    layers: [
      glow({ color: "#00f5d4", stroke: 6, blur: 14 }),
      fill(
        radialGradient(["#ffffff", "#9bf6ff", "#00bbf9"], {
          center: [0.5, 0.3],
          scope: "glyph",
        }),
      ),
    ],
  },
};
```

## Reflected gradients

`reflect: true` runs a linear gradient's stops from the middle of the gradient line out to both ends, as in Photoshop's reflected gradient. `0` is the middle and `1` is each end:

```ts demo compare
import { fill, linearGradient, stroke } from "tellu";

const style = (reflect: boolean) => ({
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 64,
  layers: [
    stroke(10, "#3a1c00"),
    fill(linearGradient(["#ffffff", "#ffd400", "#ff7a00"], { reflect })),
  ],
});

export default {
  linear: { text: "金メダル", style: style(false) },
  "reflect: true": { text: "金メダル", style: style(true) },
};
```

A bright band through the middle with darker edges reads as metal, which is why this look is common on titles.

## Conic gradients

```ts
conicGradient(stops, { angle?, center?, scope? })
```

The stops run clockwise around `center`, starting at `angle` degrees from the top (default `0`), like CSS `conic-gradient(from …)`. `center` is relative to the scope box. Repeat the first color at the end so the loop is seamless:

```ts demo
import { conicGradient, fill, stroke } from "tellu";

export default {
  text: "レインボー",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 88,
    layers: [
      stroke(14, "#ffffff"),
      fill(
        conicGradient(
          ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#bf5af2", "#ff3b30"],
          { scope: "glyph" },
        ),
      ),
    ],
  },
};
```

## Diamond gradients

```ts
diamondGradient(stops, { center?, radius?, angle?, scope? })
```

The stops run from `center` (`0`) out to a diamond, a square turned 45°, that passes through the scope box's farthest corner (`1`). `radius` scales the diamond and `angle` turns it clockwise in degrees:

```ts demo compare
import { diamondGradient, fill, stroke } from "tellu";

const sample = (angle: number) => ({
  text: "キラリ",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 80,
    layers: [
      stroke(10, "#002a5c"),
      fill(
        diamondGradient(["#ffffff", "#7fdbff", "#0057d9"], {
          angle,
          scope: "glyph",
        }),
      ),
    ],
  },
});

export default {
  "angle: 0": sample(0),
  "angle: 45": sample(45),
};
```

Canvas 2D has no diamond gradient, so tellu computes this one pixel by pixel. That costs a little more the first time each glyph is rasterized.

## Patterns

A pattern tiles any `CanvasImageSource`: an `<img>`, a canvas, an `ImageBitmap` or an `OffscreenCanvas`.

```ts demo
import { fill, shadow, stroke, type PatternPaint } from "tellu";

const tile = new OffscreenCanvas(24, 24);
const ctx = tile.getContext("2d")!;
ctx.fillStyle = "#ffd000";
ctx.fillRect(0, 0, 24, 24);
ctx.strokeStyle = "#ff5d8f";
ctx.lineWidth = 8;
for (const x of [-24, 0, 24]) {
  ctx.beginPath();
  ctx.moveTo(x, 24);
  ctx.lineTo(x + 24, 0);
  ctx.stroke();
}

const stripes: PatternPaint = { type: "pattern", source: tile };

export default {
  text: "ストライプ柄",
  style: {
    fontFamily: "RocknRoll One",
    fontSize: 88,
    layers: [
      shadow({ offset: [6, 6], blur: 0, stroke: 14, color: "#3d0b37" }),
      stroke(14, "#3d0b37"),
      fill(stripes),
    ],
  },
};
```

| Option | Default | |
| --- | --- | --- |
| `source` | | The image to tile |
| `repetition` | `"repeat"` | `"repeat-x"`, `"repeat-y"` or `"no-repeat"` |
| `scale` | `1` | Tile scale |
| `offset` | `[0, 0]` | Tile offset from the scope box's corner |
| `scope` | `"block"` | |

::: warning Images must be loaded
Pass an image that has finished loading (`await img.decode()`). Like filters, sources are compared by identity, so reuse one object instead of creating a new one per frame.
:::

## Paint on plates

[Background plates](./plates) take the same paints, scoped to the plate itself.
