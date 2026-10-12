---
description: API reference for layoutText, the Layout result, measurers, font descriptors, font loading functions and font checks.
---

# Layout & fonts

## Layout

### `layoutText()`

```ts
function layoutText(options: LayoutOptions, measurer?: Measurer): Layout;
```

Lays out text without rendering it, using the same algorithm `TextNode` uses. Pass a custom [`Measurer`](#measurer) to lay out outside the browser, for example in tests or on a server with your own font metrics.

```ts
import { layoutText } from "tellu";

const layout = layoutText({ text: "長いテロップを折り返す", maxWidth: 400, style: { fontSize: 48 } });
layout.lines.length; // number of lines
layout.fontScale;    // < 1 when overflow: "shrink" scaled the font
```

### `Layout`

| Field | |
| --- | --- |
| `writingMode` | [`WritingMode`](./types#writingmode) |
| `width`, `height` | Layout box size. The line length is `maxWidth` (`maxHeight` in vertical text) when given |
| `lines` | [`LayoutLine`](#layoutline)`[]`, top → bottom, or right → left (`vertical-rl`) / left → right (`vertical-lr`) |
| `glyphs` | [`LayoutGlyph`](#layoutglyph)`[]` |
| `runs` | [`ResolvedRun`](#resolvedrun)`[]` |
| `fontScale` | Scale applied by `overflow: "shrink"` (`1` otherwise) |

### `LayoutLine`

| Field | |
| --- | --- |
| `index` | |
| `start`, `end` | Glyph index range `[start, end)` |
| `inlineStart` | Offset of the content along the line after alignment: x in horizontal text, y in vertical text |
| `inlineSize` | Length of the content along the line, excluding trailing whitespace |
| `blockStart` | Where the line box starts across the lines: its top in horizontal text, its left edge in vertical text |
| `blockSize` | Thickness of the line box (the line height) |
| `baseline` | y in horizontal text, x of the central baseline in vertical text |
| `ascent`, `descent` | Font extents from the baseline: up / down in horizontal text, right / left in vertical text |
| `contentBox` | [`Box`](./types#box): the content's length along the line × `ascent + descent` across it |

### `LayoutGlyph`

| Field | |
| --- | --- |
| `index`, `text`, `runIndex`, `lineIndex`, `indexInLine`, `isWhitespace` | |
| `x`, `y` | Where the glyph is drawn from: the start of its baseline, before `rotation` (baseline shift included). It lies before `box` when `tsume` or `punctuationTrim` removed space in front of the glyph |
| `rotation` | `0`, or `90` for glyphs set sideways in vertical text |
| `advance` | Advance along the line after scaling, `tsume` and `punctuationTrim`, excluding letter spacing |
| `fontSize` | After `shrink` |
| `scaleX`, `scaleY` | Scale on screen, including `squeeze` and 縦中横 condensing |
| `ascent`, `descent` | Scaled font extents in the glyph's own orientation |
| `box` | [`Box`](./types#box): the glyph's cell, its advance along the line × the font's extent across it |

### `ResolvedRun`

| Field | |
| --- | --- |
| `text` | |
| `style` | The full [`TextStyle`](./types#textstyle) after the run's override |
| `tags` | Markup tags, outermost first |

### `normalizeRuns()`

```ts
function normalizeRuns(text: TextContent, base: TextStyle): ResolvedRun[];
```

Resolves `text` into runs with full styles.

## Measurement

### `Measurer`

```ts
interface Measurer {
  /** Advance width of `text` in px, without letter spacing or scaling. */
  measureText(text: string, font: FontSpec): number;
  fontMetrics(font: FontSpec): FontMetrics;
  /**
   * Places vertical punctuation and small kana by their ink, and measures the space `tsume` removes.
   * Without it they are moved by a fixed amount and `tsume` has no effect.
   */
  inkBounds?(text: string, font: FontSpec): InkBounds;
}
```

The text measurement backend used by layout. tellu measures each glyph and growing prefixes of each run, from which it derives kerning.

### `CanvasMeasurer`

The default `Measurer`, built on Canvas 2D `measureText()`. It caches results; `clear()` drops the cache.

### `getDefaultMeasurer()`

```ts
function getDefaultMeasurer(): CanvasMeasurer;
```

The shared `CanvasMeasurer`. Its cache is cleared whenever the document finishes loading fonts.

### `FontSpec`

```ts
interface FontSpec {
  family: string | readonly string[];
  size: number;
  weight: FontWeight;
  style: FontStyle;
  kerning: boolean;
}
```

### `FontMetrics`

```ts
interface FontMetrics {
  ascent: number;
  descent: number;
  /** Alphabetic baseline → ideographic baseline (the em box bottom vertical text is centered on). */
  ideographicDescent?: number;
}
```

Without `ideographicDescent`, the em box is split in the ratio of `ascent` to `descent`.

### `InkBounds`

```ts
interface InkBounds {
  left: number;
  top: number; // negative above the baseline
  right: number;
  bottom: number;
}
```

Ink extents of a glyph relative to its baseline origin, in px. Returned by `Measurer.inkBounds()`.

### `fontSpecOf()`

```ts
function fontSpecOf(style: TextStyle, size?: number): FontSpec;
```

### `fontToCss()`

```ts
function fontToCss(font: FontSpec): string; // e.g. 'normal 900 64px "Noto Sans JP"'
```

A CSS `font` shorthand. Family names are quoted, and generic families are left as they are.

## Fonts

Guide: [Fonts](/guide/fonts).

### `loadFonts()`

```ts
function loadFonts(options: Pick<LayoutOptions, "text" | "style"> | readonly FontRequest[]): Promise<void>;
```

Loads every font face (and `unicode-range` subset) the text needs, through `document.fonts.load()`. Resolves immediately outside the browser. The faces must be declared by `@font-face` rules that already exist.

### `fontsReady()`

```ts
function fontsReady(options: Pick<LayoutOptions, "text" | "style">): boolean;
```

Whether every face the text needs is already loaded.

### `fontRequests()`

```ts
function fontRequests(options: Pick<LayoutOptions, "text" | "style">): FontRequest[];
```

The fonts a text needs, and the characters drawn with each.

### `FontRequest`

```ts
interface FontRequest {
  /** CSS font shorthand, e.g. `"900 16px 'Noto Sans JP'"`. */
  font: string;
  /** Characters that will be drawn; needed for fonts split by `unicode-range`. */
  text: string;
}
```

### `checkFonts()`

```ts
function checkFonts(options: Pick<LayoutOptions, "text" | "style">): Promise<FontIssue[]>;
```

Loads the fonts a text needs, like `loadFonts()`, then checks that it can be drawn with them: every family is declared or installed, the faces for its weights and styles exist and loaded, and some font in each stack has every character. Resolves to the issues found, or `[]` outside the browser. Stacks with a generic family (`sans-serif`) accept any fallback, so their characters aren't checked. Guide: [Checking fonts](/guide/fonts#checking-fonts).

### `FontIssue`

```ts
type FontIssue =
  | { type: "family-not-found"; family: string; font: string; message: string }
  | { type: "face-unavailable"; family: string; font: string; weight: number; style: FontStyle; message: string }
  | { type: "load-failed"; family: string; font: string; message: string }
  | { type: "missing-glyphs"; font: string; characters: string; message: string };
```

| `type` | |
| --- | --- |
| `family-not-found` | No `@font-face` rule declares `family`, and it isn't installed |
| `face-unavailable` | `family` is declared, but no face has `weight` and `style` |
| `load-failed` | A face of `family` the text needs failed to load |
| `missing-glyphs` | No font in the stack has `characters` |

`font` is the CSS font of the affected runs, at 16px. `message` describes the issue in English.

### `FontIssueError`

```ts
class FontIssueError extends Error {
  readonly issues: readonly FontIssue[];
}
```

Reported when `fontCheck` is `"error"` and the fonts have issues: passed to `onError` by `<Text>`, and thrown by `createCanvasText()`. Its message lists each issue's `message`.

### `FontCheckMode`

```ts
type FontCheckMode = "warn" | "error" | "off";
```

The `fontCheck` option of `<Text>` and `createCanvasText()`: log each issue once with `console.warn`, report the issues as a `FontIssueError`, or skip the check.

### `getFontEpoch()`

```ts
function getFontEpoch(): number;
```

A counter that increments whenever the document finishes loading web fonts.

### `subscribeFontEpoch()`

```ts
function subscribeFontEpoch(listener: () => void): () => void;
```

Calls `listener` after the document finishes loading web fonts, and returns an unsubscribe function. Together with `getFontEpoch()`, it fits `useSyncExternalStore`.
