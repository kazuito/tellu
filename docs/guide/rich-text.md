---
description: Style part of a caption with runs or <tag> markup, override fonts and sizes, and patch individual layers by index or id.
---

# Rich text

`text` takes either a string or a list of **runs**. A run is a string, or an object with its own `style` override:

```ts demo
import { fill, linearGradient, shadow, stroke } from "tellu";

export default {
  text: [
    "今日は",
    {
      text: "最高",
      style: { fontSize: 112, layers: { 3: { paint: "#ff3d8b" } } },
    },
    "の日",
  ],
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      shadow({ offset: [6, 8], blur: 5, stroke: 20 }),
      stroke(20, "#1b2a7a"),
      stroke(11, "#ffffff"),
      fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"])),
    ],
  },
};
```

A run's `style` can override anything in [`TextStyle`](/api/types#textstyle). `layers` gets special treatment, described next, and [`decorations`](./decorations) add to the inherited ones instead of replacing them.

## Patching layers

A run's `layers` works one of two ways:

- **An array** replaces every layer for that run.
- **An object** patches the base layers by index or by `id`, keeping everything else.

Patching is usually what you want: the run keeps the caption's look and changes one detail.

```ts
const style = {
  layers: [
    shadow({ stroke: 20 }),           // 0
    stroke(20, "#1b2a7a", { id: "edge" }), // 1, also "edge"
    stroke(11, "#ffffff"),            // 2
    fill("#ffd000"),                  // 3
  ],
};

// Pink fill, red outer edge:
{ text: "最高", style: { layers: { 3: { paint: "#ff3d8b" }, edge: { paint: "#c2185b" } } } }

// Hide the shadow:
{ text: "静か", style: { layers: { 0: { visible: false } } } }
```

Naming layers with `id` makes patches survive reordering. Insert a layer and `edge` still points at the right one.

::: tip Keep layer counts aligned
Layers composite by slot (index) across the whole caption, so slot 1 of every run is drawn together. When a run *replaces* its layers, give it the same number of layers in the same roles. Otherwise one run's fill can end up in the same slot as another run's outline.
:::

## Markup

Building runs by hand gets noisy. `parseMarkup()` turns `<tag>` markup into runs, with one style override per tag name:

```ts demo
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tellu";

export default {
  text: parseMarkup("今日は<em>最高</em>の<b>1日</b>だった", {
    em: {
      fontSize: 112,
      layers: {
        1: { paint: "#5a0026" },
        3: {
          paint: linearGradient(["#ff8cc6", "#e0005f"], { scope: "glyph" }),
        },
      },
    },
    b: { fontFamily: "Dela Gothic One", fontWeight: 400, baselineShift: 6 },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 72,
    layers: [
      shadow({ offset: [6, 8], blur: 5, stroke: 20 }),
      stroke(20, "#1b2a7a"),
      stroke(11, "#ffffff"),
      fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"])),
    ],
  },
};
```

The syntax is deliberately small:

| Markup | Meaning |
| --- | --- |
| `<name>…</name>` | Applies the `name` style. Any tag name works, and tags without a style are allowed |
| Nested tags | Inner styles win, layer patches merge, and [`{ em }` font sizes](#relative-font-sizes) multiply |
| `<br/>` | Line break (so does `\n`) |
| `&lt;` `&gt;` `&amp;` `&quot;` `&#39;` | Escaped characters |

Unclosed or mismatched tags throw an error, so typos surface immediately.

Tag names also reach [`glyphTransform`](./animation#target-glyphs-by-tag) as `glyph.tags`, so markup can drive animation too:

```ts
parseMarkup("突然の<shake>ドッキリ</shake>！", { shake: { fontSize: 88 } });
// glyphTransform: (glyph) => glyph.tags.includes("shake") ? { … } : undefined
```

## Relative font sizes

A run's `fontSize` can be `{ em }`, a multiple of the base font size:

```ts demo
import { fill, parseMarkup, stroke } from "tellu";

export default {
  text: parseMarkup(
    "<small>なんと</small>全品<big>50%<small>OFF</small></big>",
    {
      big: { fontSize: { em: 1.6 } },
      small: { fontSize: { em: 0.5 } },
    },
  ),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 64,
    layers: [stroke({ em: 0.2 }, "#7a0019"), fill("#fff3c4")],
  },
};
```

Changing the base `fontSize` then resizes every run in proportion, so one set of tags works at any caption size. Inside another tag, `{ em }` is relative to that tag's size, as in CSS: `OFF` above is half of `big`, 0.8 × the base. Give outlines in [`{ em }`](./fitting#shrink) too and they keep in proportion with each run.

## Line breaks

`\n` in a string (or `<br/>` in markup) starts a new line. An empty line keeps the height of the style it was typed in.

```ts demo
import { fill, parseMarkup, stroke } from "tellu";

export default {
  text: parseMarkup(
    "<small>番組からのお知らせ</small><br/>今夜9時から特別番組",
    {
      small: {
        fontSize: 28,
        fontWeight: 400,
        layers: [stroke(5, "#0b1f44"), fill("#cfe3ff")],
      },
    },
  ),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    lineHeight: 1.5,
    layers: [stroke(8, "#0b1f44"), fill("#fff")],
  },
  align: "center",
};
```

## Merging styles yourself

`mergeOverrides(outer, inner)` and `applyOverride(style, override)` are the functions markup uses internally. They are exported for building your own run formats, such as subtitles parsed from a file. See [Style helpers](/api/helpers#mergeoverrides).
