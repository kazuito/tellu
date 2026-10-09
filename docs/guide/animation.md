---
description: Animate captions glyph by glyph with glyphTransform, covering position, scale, rotation, skew, opacity and visibility, plus typewriter, bounce, wave and shake recipes.
---

# Glyph transforms

`glyphTransform` is a function from each glyph to a transform. Return how a glyph should move, or nothing to leave it alone:

```ts demo
import { fill, linearGradient, stroke } from "tellu";

export default {
  text: "ガタガタ並ぶ元気な文字！",
  style: {
    fontFamily: "RocknRoll One",
    fontSize: 64,
    letterSpacing: 6,
    layers: [
      stroke(14, "#0a3d62"),
      stroke(7, "#ffffff"),
      fill(linearGradient(["#38ef7d", "#11998e"], { scope: "glyph" })),
    ],
  },
  glyphTransform: (glyph) => ({
    rotation: glyph.index % 2 ? 7 : -6,
    y: glyph.index % 2 ? 6 : -6,
  }),
};
```

Transforms don't affect layout: neighbours stay where they are, and the [layer compositing](./layers#outlines-merge) still applies. A rotated glyph's outline merges with its neighbours'.

## Animating

To animate, make the transform depend on time. On this site, animated examples export a function of the frame number (30 fps), the way a Remotion component reads `useCurrentFrame()`:

```ts demo loop=90 still=40
import { fill, shadow, stroke, type TextNodeProps } from "tellu";

export default (frame: number): TextNodeProps => ({
  text: "ぴょんぴょん跳ねる",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      shadow({ offset: [0, 8], blur: 4, stroke: 10 }),
      stroke(10, "#7b2cbf"),
      fill("#ffffff"),
    ],
  },
  glyphTransform: (glyph) => {
    const phase = (frame / 90) * Math.PI * 2 - glyph.index * 0.6;
    return {
      y: Math.min(0, Math.sin(phase) * 26),
      rotation: Math.sin(phase) * 6,
    };
  },
});
```

This is cheap. tellu rebuilds only when something *other than* `glyphTransform` changes. Every glyph layer is rasterized once, and each frame just moves the existing sprites. Keep everything else stable between frames (see [Performance](./performance)).

## The glyph

The function receives a [`GlyphContext`](/api/types#glyphcontext) for every character, whitespace included:

| Field | |
| --- | --- |
| `index`, `count` | Position among all characters |
| `visibleIndex`, `visibleCount` | Position among non-whitespace characters (`-1` for whitespace). Use this for staggering |
| `lineIndex`, `lineCount` | Which line |
| `indexInLine`, `lineLength` | Position within the line |
| `text` | The character (a grapheme cluster) |
| `runIndex`, `tags` | Which [run](./rich-text) it came from, and its markup tags |
| `isWhitespace` | |
| `x`, `y`, `width`, `height` | The glyph's box in layout coordinates |

## The transform

| Field | Default | |
| --- | --- | --- |
| `x`, `y` | `0` | Offset in px |
| `scale` | `1` | Uniform scale, multiplied with `scaleX` / `scaleY` |
| `scaleX`, `scaleY` | `1` | |
| `rotation` | `0` | Degrees, clockwise |
| `skewX`, `skewY` | `0` | Degrees |
| `opacity` | `1` | |
| `visible` | `true` | |
| `origin` | `[0.5, 0.5]` | Transform origin within the glyph box. `[0.5, 1]` is the bottom centre |

## Recipes

### Typewriter pop-in

Reveal one glyph at a time with `visibleIndex`, so spaces and line breaks don't add pauses:

```ts demo loop=90 still=60
import { fill, stroke, type TextNodeProps } from "tellu";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export default (frame: number): TextNodeProps => ({
  text: "テロップが一文字ずつ\nポンッと出てきます。",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    lineHeight: 1.35,
    layers: [stroke(12, "#e63946"), stroke(6, "#ffffff"), fill("#1d3557")],
  },
  glyphTransform: (glyph) => {
    const t = Math.min(1, Math.max(0, (frame - glyph.visibleIndex * 2) / 5));
    if (t === 0) return { visible: false };
    return { scale: 1 + 0.6 * (1 - easeOutCubic(t)), opacity: t };
  },
});
```

::: tip Reveal glyphs, don't slice text
Hiding glyphs keeps the layout fixed, so lines don't reflow and the caption doesn't jump. Changing `text` every frame would also re-layout and re-rasterize on every frame.
:::

### Staggered drop-in

```ts demo loop=75 still=60
import {
  fill,
  linearGradient,
  shadow,
  stroke,
  type TextNodeProps,
} from "tellu";

const easeOutBounce = (t: number) => {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t - 1.5 / 2.75) ** 2 + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t - 2.25 / 2.75) ** 2 + 0.9375;
  return 7.5625 * (t - 2.625 / 2.75) ** 2 + 0.984375;
};

export default (frame: number): TextNodeProps => ({
  text: "ドロップイン！",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 88,
    layers: [
      shadow({ offset: [0, 10], blur: 6, stroke: 16 }),
      stroke(16, "#003049"),
      fill(linearGradient(["#fcbf49", "#f77f00"])),
    ],
  },
  glyphTransform: (glyph) => {
    const t = Math.min(1, Math.max(0, (frame - glyph.index * 3) / 18));
    return { y: -(1 - easeOutBounce(t)) * 90, opacity: Math.min(1, t * 4) };
  },
});
```

### Target glyphs by tag

[Markup](./rich-text#markup) tags arrive as `glyph.tags`, so the text itself can say what moves:

```ts demo loop=60 still=10
import { fill, parseMarkup, stroke, type TextNodeProps } from "tellu";

const noise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

const text = parseMarkup(
  "突然の<shake>ドッキリ</shake>に<shake>大パニック</shake>！",
  {
    shake: {
      fontFamily: "Reggae One",
      fontWeight: 400,
      fontSize: 76,
      layers: { 2: { paint: "#ff3b30" } },
    },
  },
);

export default (frame: number): TextNodeProps => ({
  text,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [stroke(12, "#111"), stroke(6, "#ffffff"), fill("#111")],
  },
  glyphTransform: (glyph) => {
    if (!glyph.tags.includes("shake")) return;
    const seed = glyph.index * 31 + Math.floor(frame / 2) * 7;
    return {
      x: noise(seed) * 4,
      y: noise(seed + 1) * 4,
      rotation: noise(seed + 2) * 6,
    };
  },
});
```

The markup is parsed once, outside the frame function. It would work inside too, since equal runs compare equal, but there's no reason to redo the work every frame.

### Wave

```ts demo loop=60 still=0
import { fill, linearGradient, stroke, type TextNodeProps } from "tellu";

export default (frame: number): TextNodeProps => ({
  text: "WAVE ウェーブ",
  style: {
    fontFamily: "Montserrat, Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      stroke(12, "#0b132b"),
      fill(
        linearGradient(["#5bc0eb", "#9bc53d"], { angle: 90, scope: "block" }),
      ),
    ],
  },
  glyphTransform: (glyph) => {
    const phase = (frame / 60) * Math.PI * 2 - glyph.index * 0.5;
    return {
      y: Math.sin(phase) * 12,
      scaleY: 1 + Math.cos(phase) * 0.08,
      origin: [0.5, 1],
    };
  },
});
```

Because the gradient's scope is `"block"`, it stays fixed in place while the glyphs move through it.

## Whole-caption motion

To move, fade or clip the whole caption, transform its container instead: CSS on `<Text>`, or the `TextNode`'s own position in PixiJS. A karaoke wipe, for example, is two copies of the same caption with the colored one revealed by `clip-path`. See the [Subtitles example](/examples/broadcast#karaoke-subtitles).
