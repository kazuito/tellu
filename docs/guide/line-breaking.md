---
description: Wrapping to a width, balanced lines and short last lines (泣き別れ), alignment and justification, Japanese kinsoku rules (禁則処理), hanging punctuation (ぶら下げ), punctuation trimming at line edges (約物の半角取り), space between Japanese and Latin text (和欧間アキ) and phrase-aware line breaking (文節改行).
---

# Line breaking

## Wrapping

Set `maxWidth` and text wraps to fit it. `maxWidth` also becomes the width of the layout box. Without it, a caption is exactly as wide as its longest line. (In [vertical text](./vertical), `maxHeight` plays this role.)

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "長いテロップは幅に合わせて自動で折り返されます。Long English text wraps at spaces, too.",
  maxWidth: 520,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 34,
    lineHeight: 1.45,
    layers: [stroke(6, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
};
```

The faint plate on this page's demos marks the layout box. Japanese and Chinese text may break between any two characters, while Latin text breaks at spaces and after hyphens. Leading spaces on a wrapped line are dropped.

`wrap: "none"` keeps only the explicit `\n` line breaks while `maxWidth` still sets the box. Use it with [`overflow`](./fitting) to fit one line into a fixed width.

## Balanced lines

By default (`wrap: "auto"`), each line is filled before the next one starts, which can leave a caption with a long first line and a few characters on the second. Two more modes change where lines break:

- `wrap: "balance"` makes the lines of each paragraph about equally long, by wrapping at the shortest width that keeps the same number of lines.
- `wrap: "pretty"` only acts when the last line of a paragraph holds a single word, phrase or character with its punctuation (泣き別れ). It moves the break before it earlier so the last line gets company.

```ts demo compare
import { fill, stroke, type TextWrap } from "tellu";

const props = (wrap: TextWrap) => ({
  text: "改行の位置しだいで字幕の読みやすさが変わる。",
  maxWidth: 580,
  wrap,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 28,
    lineHeight: 1.4,
    layers: [stroke(6, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
});

export default {
  'wrap: "auto"': props("auto"),
  'wrap: "balance"': props("balance"),
  'wrap: "pretty"': props("pretty"),
};
```

Both work per paragraph (text between `\n`), and with `lineBreak: "phrase"` they keep phrases together. The layout box keeps the full `maxWidth`, so `align` and `justify` still use it: a balanced, justified paragraph spreads its lines to `maxWidth`. Without a line length they do nothing.

## Alignment

`align` places each line in the layout box: `"start"` (the default), `"center"`, `"end"`, `"justify"` or `"justify-all"`. `"start"` and `"end"` follow the writing direction, and `"left"` / `"right"` are accepted as aliases for them.

```ts demo compare
import { fill, stroke, type TextAlign } from "tellu";

const props = (align: TextAlign) => ({
  text: "字幕は読みやすさが大切です。Captions should read at a glance.",
  maxWidth: 260,
  align,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 24,
    lineHeight: 1.4,
    layers: [stroke(4, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
});

export default {
  start: props("start"),
  center: props("center"),
  end: props("end"),
  justify: props("justify"),
  "justify-all": props("justify-all"),
};
```

`justify` stretches every line except the last (and lines ended by `\n`) to the full `maxWidth`. It widens the gaps at spaces when a line has any, and otherwise spreads the extra space between all the characters, which is the usual style for Japanese.

### Spreading every line (均等配置)

`justify-all` stretches every line, including the last one and lines ended by `\n`. It sets a word across a fixed width (字取り), as in credits and name lists. Without `maxWidth`, lines spread to the longest one:

```ts demo
import { fill, stroke } from "tellu";

export default {
  text: "司会\n出演\n音楽監督",
  align: "justify-all",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 40,
    lineHeight: 1.4,
    layers: [stroke(6, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
};
```

A line with a single character stays at the start.

## Kinsoku (禁則処理)

Japanese typesetting forbids some characters at the start or end of a line. A line must not start with 。、」 or small kana like ッ, and must not end with 「 or （. tellu applies these rules by default and moves the break to the nearest allowed position:

```ts demo compare
import { fill, stroke } from "tellu";

const props = (kinsoku: boolean) => ({
  text: "今日はとても楽しかった。また明日も遊ぼうね！",
  maxWidth: 300,
  kinsoku,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 32,
    lineHeight: 1.4,
    layers: [stroke(5, "#111"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
});

export default { "kinsoku: true": props(true), "kinsoku: false": props(false) };
```

With the rules on:

- **Line-start rule (行頭禁則)**: closing brackets, punctuation, small kana, ー, ・ and similar characters never begin a line.
- **Line-end rule (行末禁則)**: opening brackets never end a line.
- **Inseparable characters (分離禁止)**: runs like `……` and `——` are never split.
- **Hanging punctuation (ぶら下げ)**: when 、 or 。 would start the next line, it hangs past `maxWidth` on the current one instead.

### Custom rules

Pass an object to change any of the four character sets. Sets you don't list keep their defaults:

```ts
{
  kinsoku: {
    hanging: "", // never hang punctuation
    lineStart: defaultKinsoku.lineStart + "ゝゞ",
  },
}
```

`defaultKinsoku` is exported if you want to build on the defaults. `kinsoku: false` turns all the rules off.

## Punctuation at line edges (約物の半角取り)

Fullwidth brackets and 、。 take a whole em, half of it blank. At the edge of a line that blank half makes the text look indented, or off-center in a centered caption. `punctuationTrim` removes it:

- `"start"`: before opening brackets such as 「 and （ at the start of a line.
- `"end"`: after closing brackets, 、 and 。 at the end of a line.
- `"both"`: both.
- `"none"` (the default): keeps the full em.

```ts demo compare
import { fill, type PunctuationTrim, stroke } from "tellu";

const props = (punctuationTrim: PunctuationTrim) => ({
  text: "「えっ、本当に？」\n「本当です。」",
  align: "center" as const,
  punctuationTrim,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 40,
    lineHeight: 1.4,
    layers: [stroke(6, "#111"), fill("#fff")],
  },
  background: {
    paint: "rgba(255,255,255,0.1)",
    padding: 0,
    mode: "line" as const,
  },
});

export default {
  'punctuationTrim: "none"': props("none"),
  'punctuationTrim: "both"': props("both"),
};
```

With `"end"` (or `"both"`), closing punctuation that only fits within `maxWidth` once trimmed stays on its line instead of being pushed to the next one or hung past the edge. Punctuation in the middle of a line keeps its full width; adjacent pairs such as `」「` are already closed up by the font. Only fullwidth punctuation is trimmed, and [`tsume`](./typography#tsume-文字ツメ) counts toward the trimmed half.

## Space between Japanese and Latin text (和欧間アキ)

`autospace` adds space wherever kana or kanji meet Latin letters or digits, as Japanese typesetting does between scripts. `true` adds a quarter em of the smaller font; a px number or `{ em }` sets the amount. The default is `false`.

```ts demo compare
import { fill, stroke } from "tellu";

const props = (autospace: boolean) => ({
  text: "最新のiPhoneで4K動画を撮影",
  autospace,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 40,
    layers: [stroke(6, "#111"), fill("#fff")],
  },
});

export default {
  "autospace: false": props(false),
  "autospace: true": props(true),
};
```

No space is added where there already is one, next to punctuation or fullwidth letters, or at the start of a line, and 縦中横 in [vertical text](./vertical) is left alone.

## Phrase breaking (文節改行)

By default, Japanese text breaks between any two characters, so a word can split across lines. `lineBreak: "phrase"` keeps phrases (文節) together and breaks between them, the way captions are usually hand-broken:

```ts demo compare
import { fill, type LineBreak, stroke } from "tellu";

const props = (lineBreak: LineBreak) => ({
  text: "日本語の文章を文節単位で折り返すと読みやすくなります",
  maxWidth: 330,
  lineBreak,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 32,
    lineHeight: 1.4,
    layers: [stroke(5, "#222"), fill("#fff")],
  },
  background: { paint: "rgba(255,255,255,0.1)", padding: 0 },
});

export default {
  'lineBreak: "char"': props("char"),
  'lineBreak: "phrase"': props("phrase"),
};
```

Phrases are found with `Intl.Segmenter`: hiragana-only words such as particles and okurigana attach to the word before them. It is a heuristic. If a phrase is too long for the line, tellu falls back to breaking inside it rather than overflowing.

::: tip Hand-break important captions
For on-air captions, an explicit `\n` is still the most reliable break. Use `"phrase"` for generated or user-supplied text.
:::

## Locale

`locale` (default `"ja"`) sets the language for grapheme and word segmentation. Grapheme clusters keep emoji, combining marks and Korean syllables in one piece regardless of locale.
