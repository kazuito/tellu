---
description: Markers, highlights and frames along runs of text with decorations, which follow line breaks, justification and vertical writing, and add up across nested markup tags.
---

# Decorations

Decorations are drawn along runs of text: a marker (蛍光ペン) under the important words, a highlight behind a name, a frame around a keyword. Put them in a style's `decorations`, usually through a [markup](./rich-text#markup) tag:

```ts demo backdrop=light
import { fill, marker, parseMarkup } from "tellu";

export default {
  text: parseMarkup("ここが<em>いちばん大事</em>なポイント", {
    em: { decorations: [marker("#ffe600")] },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [fill("#1b1b3a")],
  },
};
```

Each decoration is placed from the laid-out glyphs, so it follows everything the layout does: one box per line when the run wraps, the extra space of `justify`, `shrink`, and vertical writing.

## Markers and highlights

`marker(paint, options?)` paints a box behind the run, over the lower half of the em box. `inset` picks the part of the em box it covers across the line, from the top (`0`) to the bottom (`1`). `[0, 1]` covers the whole em box, which makes a highlight, like a plate behind just those words:

```ts demo compare backdrop=light
import { fill, marker, parseMarkup, type TextNodeProps } from "tellu";

const sample = (decoration: ReturnType<typeof marker>): TextNodeProps => ({
  text: parseMarkup("今日の<em>おすすめ</em>は", {
    em: { decorations: [decoration] },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 48,
    layers: [fill("#1b1b3a")],
  },
});

export default {
  "marker()": sample(marker("#7cff6b")),
  "inset: [0.3, 1.1]": sample(marker("#7cff6b", { inset: [0.3, 1.1] })),
  highlight: sample(
    marker("#ffd1ec", { inset: [0, 1], padding: [8, 2], radius: 8 }),
  ),
};
```

Markers sit behind the glyphs, including their outlines, and above the [plate](./plates). With a thick outline, let the marker reach past the text with `inset` or `padding`, or it hides behind the outline.

## Frames

`frame(paint, options?)` draws a border around the run with no fill. `width` sets the border (default `3`):

```ts demo backdrop=light
import { fill, frame, parseMarkup } from "tellu";

export default {
  text: parseMarkup("答えは<a>B</a>でした", {
    a: {
      fontFamily: "Montserrat",
      decorations: [frame("#e60033", { width: 5, radius: 10 })],
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [fill("#1b1b3a")],
  },
};
```

## Slanted boxes

`skew` slants a box into a parallelogram, in degrees. A negative value leans it back, like a quick stroke of a marker pen:

```ts demo backdrop=light
import { fill, linearGradient, marker, parseMarkup } from "tellu";

export default {
  text: parseMarkup("<em>新発売</em>のお知らせ", {
    em: {
      decorations: [
        marker(linearGradient(["#ff6fb5", "#ffc2e2"], { angle: 90 }), {
          skew: -20,
          inset: [0.4, 1.05],
          padding: [10, 0],
        }),
      ],
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 56,
    layers: [fill("#1b1b3a")],
  },
};
```

## Wrapping and vertical text

A run that wraps gets one box per line. In vertical text, boxes run along the columns, and `inset` goes from the right side (`0`) to the left side (`1`) of the em box:

```ts demo compare backdrop=light
import { fill, frame, marker, parseMarkup, type TextNodeProps } from "tellu";

const tags = {
  em: { decorations: [marker("#ffe600", { radius: 4 })] },
  f: { decorations: [frame("#0a84ff", { radius: 6 })] },
};
const style = {
  fontFamily: "Noto Sans JP",
  fontWeight: 700,
  fontSize: 32,
  lineHeight: 1.6,
  layers: [fill("#1b1b3a")],
};

export default {
  wrapped: {
    text: parseMarkup(
      "折り返しても<em>マーカーは行ごとに分かれて</em>付きます",
      tags,
    ),
    maxWidth: 300,
    style,
  },
  vertical: {
    text: parseMarkup("縦書きでも<em>同じように</em>使える<f>囲み</f>", tags),
    writingMode: "vertical-rl",
    style,
  },
} satisfies Record<string, TextNodeProps>;
```

Whitespace at the start and end of a line is never decorated. Spaces inside a run are.

## In front of the glyphs

`placement: "front"` draws the box over the glyphs instead of behind them:

```ts demo
import { fill, frame, parseMarkup, stroke } from "tellu";

export default {
  text: parseMarkup("定価<x>3,980円</x>のところ", {
    x: {
      decorations: [
        frame("#ff2d2d", {
          placement: "front",
          width: 4,
          inset: [0.48, 0.52],
          padding: [6, 0],
        }),
      ],
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    layers: [stroke(8, "#1b1b3a"), fill("#ffffff")],
  },
};
```

## Combining decorations

Decorations add up. A run's `decorations` are added to the ones it inherits from the base style and from enclosing markup tags, like CSS `text-decoration`, so nested tags keep both:

```ts
parseMarkup("<em>とても<f>大事</f>な</em>話", {
  em: { decorations: [marker("#ffe600")] },
  f: { decorations: [frame("#e60033")] },
});
// 大事 gets the marker and the frame.
```

Equal decorations are only drawn once, and neighbouring runs with equal decorations share one box, even when their other styles differ. A decoration in the base style decorates the whole text.

## Options

| Option | Default | |
| --- | --- | --- |
| `paint` | | Fill. Gradients and patterns span each box |
| `stroke` | | `{ width, paint }`: a border centered on the box's edge |
| `inset` | `[0, 1]` | The part of the em box covered across the line, from the over side (`0`) to the under side (`1`) |
| `padding` | `0` | `[along, across]` the line in px, or one value for both |
| `radius` | `0` | Corner radius, clamped to half the box's size |
| `skew` | `0` | Slant in degrees |
| `placement` | `"behind"` | `"behind"` the glyphs or in `"front"` of them |
| `offset`, `blur`, `opacity`, `blendMode`, `filters` | | Effects, as for [layers](./layers) |

`marker()` sets `inset: [0.5, 1]` and `padding: [2, 0]`; `frame()` sets `padding: [4, 2]`. See [`BoxDecoration`](/api/types#boxdecoration).

Decorations don't move with [glyph transforms](./animation), and don't add to the layout box. Their boxes are in [`layout.decorations`](/api/layout#layoutdecoration), for example to place your own elements along a run.
