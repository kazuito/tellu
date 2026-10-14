---
description: Animate captions glyph by glyph with glyphTransform and its helpers and presets, covering position, scale, rotation, skew, opacity, visibility, tint and single layers, clipping and karaoke wipes, plus typewriter, word-by-word, bounce, wave and shake recipes.
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

## Animation helpers

For the common entrances you don't need to write the math. The presets return a function of the time that gives the `glyphTransform` of that moment:

```ts demo loop=90 still=60
import { fill, popIn, stroke, type TextNodeProps } from "tellu";

const animation = popIn({ stagger: 3 });

export default (frame: number): TextNodeProps => ({
  text: "ポンッと登場！",
  style: {
    fontFamily: "Dela Gothic One",
    fontSize: 80,
    layers: [stroke(14, "#e63946"), stroke(7, "#ffffff"), fill("#1d3557")],
  },
  glyphTransform: animation(frame),
});
```

`fadeIn()`, `typewriter()`, `popIn()`, `slideIn()` and `dropIn()` animate each unit once; `wave()` and `shake()` loop forever. Every preset takes the timing: `by` (`"glyph"`, `"word"`, `"line"` or `"text"`), `delay`, `stagger`, `duration` and `order` (`"forward"`, `"backward"`, `"center"`, `"edges"` or `"random"`). Defaults are in frames at 30 fps.

`animateText()` builds your own from two states, and `combineGlyphTransforms()` plays several at once. Here words rise in from the middle out while the whole caption waves:

```ts demo loop=120 still=70
import {
  animateText,
  combineGlyphTransforms,
  fill,
  stroke,
  type TextNodeProps,
  wave,
} from "tellu";

const rise = animateText({
  by: "word",
  order: "center",
  stagger: 8,
  duration: 16,
  from: { y: 40, opacity: 0, tint: "#ffd400" },
});
const bob = wave({ amplitude: 6, period: 40 });

export default (frame: number): TextNodeProps => ({
  text: "真ん中から順番に浮かび上がる",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    layers: [stroke(10, "#0b132b"), fill("#ffffff")],
  },
  glyphTransform: combineGlyphTransforms(rise(frame), bob(frame)),
});
```

With `direction: "out"` an animation plays backward, from `to` to `from`, to take a caption off screen. `animationDuration(timing, glyph)` tells how long one takes, and `unitProgress(glyph, time, timing)` gives each glyph's progress for animations of your own. See the [animation API](/api/animation).

## The glyph

The function receives a [`GlyphContext`](/api/types#glyphcontext) for every character, whitespace included:

| Field | |
| --- | --- |
| `index`, `count` | Position among all characters |
| `visibleIndex`, `visibleCount` | Position among non-whitespace characters (`-1` for whitespace). Use this for staggering |
| `wordIndex`, `wordCount` | Position among words (`-1` for whitespace). [Word by word](#word-by-word) |
| `lineIndex`, `lineCount` | Which line |
| `indexInLine`, `lineLength` | Position within the line |
| `text` | The character (a grapheme cluster) |
| `runIndex`, `tags` | Which [run](./rich-text) it came from, and its markup tags |
| `isWhitespace` | |
| `x`, `y`, `width`, `height` | The glyph's box in layout coordinates |
| `angle` | The glyph's rotation in degrees on a [text path](./text-path), else `0` |

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
| `tint` | | Multiplies the glyph's colors. A white fill takes the tint's color. [Tint and single layers](#tint-and-single-layers) |
| `layers` | | `opacity`, `tint` and `visible` of single layers, by index or `id` |

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

### Word by word

`wordIndex` numbers the words: phrases (文節) such as 「今日は」 or 「最高の」 in Japanese, and words with their punctuation in spaced text. Brackets stay with the words they enclose. Revealing a word at a time reads like speech:

```ts demo loop=90 still=70
import { fill, stroke, type TextNodeProps } from "tellu";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export default (frame: number): TextNodeProps => ({
  text: "「今日は、最高の日！」と彼は言った。",
  maxWidth: 640,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    layers: [stroke(10, "#0a3d62"), fill("#ffffff")],
  },
  glyphTransform: (glyph) => {
    const t = Math.min(1, Math.max(0, (frame - glyph.wordIndex * 8) / 8));
    if (t === 0) return { visible: false };
    return { y: (1 - easeOutCubic(t)) * 16, opacity: t };
  },
});
```

The words are the phrases that [`lineBreak: "phrase"`](./line-breaking#phrase-breaking-文節改行) keeps together, so they follow the same rules in every caption.

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

## Tint and single layers

`tint` multiplies a glyph's colors, so a white fill takes the tint's color and other colors darken toward it. `layers` changes single layers of a glyph by index or `id`, as [layer patches](./rich-text#patching-layers) do: their `opacity`, `tint` and `visible`. Neither rebuilds the caption, so they can follow the speech every frame:

```ts demo loop=120 still=50
import { fill, glow, stroke, type TextNodeProps } from "tellu";

export default (frame: number): TextNodeProps => {
  const spoken = Math.floor(frame / 20);
  return {
    text: "今日は最高の天気ですね",
    style: {
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 60,
      layers: [
        glow({ id: "glow", color: "#ffd400", stroke: 8, blur: 12 }),
        stroke(10, "#1b1b3a"),
        fill("#ffffff"),
      ],
    },
    glyphTransform: (glyph) => {
      const current = glyph.wordIndex === spoken % glyph.wordCount;
      return {
        tint: current ? "#ffe14d" : undefined,
        layers: { glow: { visible: current } },
      };
    },
  };
};
```

A tint's alpha is ignored; fade with `opacity`. Tints multiply, so a black outline stays black.

## Clipping

`clip` shows the glyphs and decorations only inside boxes, in layout coordinates; the plate stays whole. Like `glyphTransform`, it can change every frame without a rebuild. It takes the boxes, or a function of the [layout](/api/layout#layout) that returns them. [`wipeClip(layout, progress)`](/api/layout#wipeclip) builds the boxes of a wipe along the lines, in reading order, which across several lines is beyond what CSS `clip-path` can do:

```ts demo loop=120 still=80
import { fill, stroke, type TextNodeProps, wipeClip } from "tellu";

export default (frame: number): TextNodeProps => ({
  text: "カラオケのワイプは\n二行目にも続きます",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [stroke(10, "#1a237e"), fill("#ffe14d")],
  },
  clip: (layout) => wipeClip(layout, frame / 100),
});
```

Stack it over a copy in its unsung colors for a karaoke caption: see [Karaoke subtitles](/examples/broadcast#karaoke-subtitles). Each line's box reaches halfway to the next line and `margin` (2) font sizes past the text elsewhere, so outlines and shadows are wiped with their glyphs.

## Whole-caption motion

To move or fade the whole caption, transform its container instead: CSS on `<Text>`, or the `TextNode`'s own position in PixiJS.
