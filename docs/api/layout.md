---
description: API reference for layoutText, the Layout result, measurers, font descriptors and font loading functions.
---

# Layout & fonts

## Layout

### `layoutText()`

```ts
function layoutText(options: LayoutOptions, measurer?: Measurer): Layout;
```

Lays out text without rendering it, using the same algorithm `TextNode` uses. Pass a custom [`Measurer`](#measurer) to lay out outside the browser, for example in tests or on a server with your own font metrics.

```ts
import { layoutText } from "tixi";

const layout = layoutText({ text: "長いテロップを折り返す", maxWidth: 400, style: { fontSize: 48 } });
layout.lines.length; // number of lines
layout.fontScale;    // < 1 when overflow: "shrink" scaled the font
```

### `Layout`

| Field | |
| --- | --- |
| `width`, `height` | Layout box size. `width` is `maxWidth` when given |
| `lines` | [`LayoutLine`](#layoutline)`[]` |
| `glyphs` | [`LayoutGlyph`](#layoutglyph)`[]` |
| `runs` | [`ResolvedRun`](#resolvedrun)`[]` |
| `fontScale` | Scale applied by `overflow: "shrink"` (`1` otherwise) |

### `LayoutLine`

| Field | |
| --- | --- |
| `index` | |
| `start`, `end` | Glyph index range `[start, end)` |
| `x` | Left edge of the content after alignment |
| `top`, `height` | Line box |
| `baseline` | Baseline y |
| `width` | Content width, excluding trailing whitespace |
| `ascent`, `descent` | Tallest font extents on the line |

### `LayoutGlyph`

| Field | |
| --- | --- |
| `index`, `text`, `runIndex`, `lineIndex`, `indexInLine`, `isWhitespace` | |
| `x` | Left edge of the glyph's advance |
| `y` | Baseline, including baseline shift |
| `advance` | Advance width including scaling, excluding letter spacing |
| `fontSize` | After `shrink` |
| `scaleX`, `scaleY` | Including `squeeze` |
| `ascent`, `descent` | Scaled font extents |

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
}
```

The text measurement backend used by layout. tixi measures each glyph and growing prefixes of each run, from which it derives kerning.

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
}
```

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
