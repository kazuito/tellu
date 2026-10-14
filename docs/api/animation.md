---
description: API reference for the animation helpers (animateText, unitProgress, animationDuration, combineGlyphTransforms, easings) and the presets fadeIn, typewriter, popIn, slideIn, dropIn, wave and shake.
---

# Animation

Helpers that build [`glyphTransform`](./types#glyphtransformfn) functions. Each takes the time and returns the transform of that moment, so in Remotion:

```tsx
const frame = useCurrentFrame();
<Text text="…" glyphTransform={popIn({ by: "word", stagger: 6 })(frame)} />;
```

Times are in whatever unit you play them in. The presets' defaults are in frames at 30 fps. Guide: [Animation helpers](/guide/animation#animation-helpers).

## Building animations

### `animateText()`

```ts
function animateText(animation: TextAnimation): TextAnimationFn;
```

Animates every glyph from `from` to `to`, unit by unit. A glyph at rest gets no transform, so a finished animation costs nothing.

### `TextAnimation`

[`StaggerTiming`](#staggertiming), plus:

| Option | Type | Default | |
| --- | --- | --- | --- |
| `from` | [`GlyphKeyframe`](#glyphkeyframe) | `{}` | The state units start from (`"in"`) or end in (`"out"`) |
| `to` | [`GlyphKeyframe`](#glyphkeyframe) | `{}` | The state units settle in (`"in"`) or start from (`"out"`). `{}` is the layout's |
| `easing` | `(t: number) => number` | `easings.easeOutCubic` | Shapes each unit's progress. Remotion's `Easing` functions work too |
| `origin` | `readonly [x, y]` | `[0.5, 0.5]` | Transform origin within each glyph's cell |
| `direction` | `"in" \| "out"` | `"in"` | `"out"` plays from `to` back to `from`, e.g. to fade out |

Numbers, tints and layer opacities are interpolated; `visible` switches as soon as a unit starts.

### `TextAnimationFn`

```ts
type TextAnimationFn = (time: number) => GlyphTransformFn;
```

### `GlyphKeyframe`

```ts
type GlyphKeyframe = Omit<GlyphTransform, "origin" | "x" | "y"> & {
  x?: Length;
  y?: Length;
};
```

A [`GlyphTransform`](./types#glyphtransform) without `origin`, whose `x` and `y` are a [`Length`](./types#length): px, or `{ em }` of each glyph's font size after [`shrink`](/guide/fitting#shrink). `{ em }` shifts move large and small glyphs in proportion: `from: { y: { em: 0.5 } }` slides every glyph in from half its size below.

### `StaggerTiming`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `by` | [`AnimationUnit`](#animationunit) | `"glyph"` | What animates as one |
| `delay` | `number` | `0` | When the first unit starts |
| `stagger` | `number` | `0` | Time between the starts of consecutive units |
| `duration` | `number` | | How long each unit takes. `0` switches at once |
| `order` | [`AnimationOrder`](#animationorder) | `"forward"` | The order units start in |
| `seed` | `number` | `0` | Shuffles `order: "random"` |

### `AnimationUnit`

```ts
type AnimationUnit = "glyph" | "word" | "line" | "text";
```

Each visible glyph (whitespace doesn't take a turn), each [word](/guide/animation#word-by-word), each line, or the whole text at once.

### `AnimationOrder`

```ts
type AnimationOrder = "forward" | "backward" | "center" | "edges" | "random";
```

First to last, last to first, from the middle out, from both ends in, or shuffled (the same for the same `seed`).

### `unitProgress()`

```ts
function unitProgress(glyph: GlyphContext, time: number, timing: StaggerTiming): number;
```

How far a glyph's unit is through its animation: `0` before it starts, `1` once it is done, linear in between. The building block for animations of your own:

```ts
glyphTransform: (glyph) => {
  const t = unitProgress(glyph, frame, { by: "word", stagger: 6, duration: 8 });
  return { rotation: (1 - t) * 30, opacity: t };
};
```

### `animationDuration()`

```ts
function animationDuration(
  timing: StaggerTiming,
  counts: Pick<GlyphContext, "visibleCount" | "wordCount" | "lineCount">,
): number;
```

When the last unit finishes. Pass any [`GlyphContext`](./types#glyphcontext) of the caption, e.g. `createGlyphContexts(layoutText(props))[0]`, to size a Remotion `<Sequence>`.

### `combineGlyphTransforms()`

```ts
function combineGlyphTransforms(...transforms: (GlyphTransformFn | undefined)[]): GlyphTransformFn;
```

One transform made of several, e.g. an entrance plus a wave. Offsets, rotations and skews add up; scales, opacities and tints multiply; a glyph is visible only if every transform keeps it visible; the first `origin` wins.

### `easings`

`linear`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeOutBack` (overshoots, then settles), `easeOutBounce` and `easeOutElastic`, each `(t: number) => number`.

## Presets

### `fadeIn()`

```ts
function fadeIn(options?: AnimationPresetOptions): TextAnimationFn;
```

Fades each unit in. Defaults: by glyph, `stagger: 2`, `duration: 10`. With `direction: "out"`, fades them out.

### `typewriter()`

```ts
function typewriter(options?: Omit<AnimationPresetOptions, "duration" | "easing">): TextAnimationFn;
```

Shows each unit at once, one after another. Defaults: by glyph, `stagger: 2`.

### `popIn()`

```ts
function popIn(options?: AnimationPresetOptions): TextAnimationFn;
```

Scales each unit up from nothing with a slight overshoot. Defaults: by glyph, `stagger: 2`, `duration: 12`, `easeOutBack`.

### `slideIn()`

```ts
function slideIn(options?: AnimationPresetOptions & { offset?: readonly [x: Length, y: Length] }): TextAnimationFn;
```

Slides each unit in from `offset` away (px, or `{ em }` of each glyph's font size) while fading it in. Defaults: from `[0, 40]` (below), `stagger: 2`, `duration: 14`.

### `dropIn()`

```ts
function dropIn(options?: AnimationPresetOptions & { height?: Length }): TextAnimationFn;
```

Drops each unit from `height` above (px, or `{ em }` of each glyph's font size) with a bounce. Defaults: `height: 80`, `stagger: 3`, `duration: 20`, `easeOutBounce`.

### `AnimationPresetOptions`

Any [`StaggerTiming`](#staggertiming) option (all optional), plus `easing`, `origin` and `direction` from [`TextAnimation`](#textanimation).

### `wave()`

```ts
function wave(options?: WaveOptions): TextAnimationFn;
```

Bobs units up and down in a wave that runs along the text, forever.

### `WaveOptions`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `by` | [`AnimationUnit`](#animationunit) | `"glyph"` | |
| `amplitude` | [`Length`](./types#length) | `10` | How far units move, in px or `{ em }` of each glyph's font size |
| `period` | `number` | `60` | Time of one wave |
| `lag` | `number` | `0.08` | How far behind the previous unit each one is, in waves |

### `shake()`

```ts
function shake(options?: ShakeOptions): TextAnimationFn;
```

Jitters units in random poses, forever. Each unit moves on its own.

### `ShakeOptions`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `by` | [`AnimationUnit`](#animationunit) | `"glyph"` | |
| `amount` | [`Length`](./types#length) | `4` | Largest offset, in px or `{ em }` of each glyph's font size |
| `rotation` | `number` | `6` | Largest rotation in degrees |
| `interval` | `number` | `2` | Time each pose is held |
| `seed` | `number` | `0` | Changes the poses |
