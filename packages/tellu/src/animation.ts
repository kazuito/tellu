import { mixTints, multiplyTints, tintOf } from "./render/tint";
import { resolveLength } from "./style/defaults";
import type { ColorValue, GlyphContext, GlyphTransform, GlyphTransformFn, LayerTransform, Length } from "./style/types";

/** What animates as one: each visible glyph, word or line, or the whole text at once. */
export type AnimationUnit = "glyph" | "word" | "line" | "text";

/**
 * The order units start in.
 * - `forward`: first to last
 * - `backward`: last to first
 * - `center`: from the middle out to both ends
 * - `edges`: from both ends in to the middle
 * - `random`: a shuffled order, the same for the same `seed`
 */
export type AnimationOrder = "forward" | "backward" | "center" | "edges" | "random";

/**
 * When each unit of a caption animates. Times are in whatever unit the animation is played in, usually frames (the
 * presets' defaults assume 30 fps).
 */
export interface StaggerTiming {
  /** Default: `"glyph"`. */
  by?: AnimationUnit;
  /** When the first unit starts. Default: `0`. */
  delay?: number;
  /** Time between the starts of consecutive units. Default: `0`. */
  stagger?: number;
  /** How long each unit takes. `0` switches at once. */
  duration: number;
  /** Default: `"forward"`. */
  order?: AnimationOrder;
  /** Shuffles `order: "random"`. Default: `0`. */
  seed?: number;
}

/**
 * A state of a glyph to animate from or to: any `GlyphTransform` field except `origin`, with shifts in px or `{ em }`
 * of the glyph's font size.
 */
export type GlyphKeyframe = Omit<GlyphTransform, "origin" | "x" | "y"> & {
  /** Shift in px, or `{ em }` of the glyph's font size. Default: `0`. */
  x?: Length;
  /** Shift in px, or `{ em }` of the glyph's font size. Default: `0`. */
  y?: Length;
};

/** An animation of every glyph from one state to another, unit by unit. */
export interface TextAnimation extends StaggerTiming {
  /** The state units start from (`"in"`) or end in (`"out"`). Default: `{}`, as laid out. */
  from?: GlyphKeyframe;
  /** The state units settle in (`"in"`) or start from (`"out"`). Default: `{}`, as laid out. */
  to?: GlyphKeyframe;
  /** Shapes each unit's progress, from `0`–`1` to `0`–`1`. Default: `easings.easeOutCubic`. */
  easing?: (t: number) => number;
  /** Transform origin as fractions of each glyph's cell. Default: `[0.5, 0.5]`. */
  origin?: readonly [number, number];
  /** `"in"` goes from `from` to `to`; `"out"` plays it backward, from `to` to `from`. Default: `"in"`. */
  direction?: "in" | "out";
}

/** An animation played at a time: returns the `glyphTransform` of that moment. */
export type TextAnimationFn = (time: number) => GlyphTransformFn;

/** Easing curves for `TextAnimation.easing`. Remotion's `Easing` functions work too. */
export const easings = {
  linear: (t: number) => t,
  easeInCubic: (t: number) => t ** 3,
  easeOutCubic: (t: number) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  /** Overshoots, then settles. */
  easeOutBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  /** Bounces at the end, like a dropped ball. */
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t - 1.5 / 2.75) ** 2 + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t - 2.25 / 2.75) ** 2 + 0.9375;
    return 7.5625 * (t - 2.625 / 2.75) ** 2 + 0.984375;
  },
  /** Springs past the end and wobbles back. */
  easeOutElastic: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin(((t * 10 - 0.75) * 2 * Math.PI) / 3) + 1,
} as const;

/** The glyph's unit, `[index, count]`, or `null` for whitespace in `"glyph"` mode. */
function unitOf(glyph: GlyphContext, by: AnimationUnit): [index: number, count: number] | null {
  if (by === "text") return [0, 1];
  if (by === "line") return [glyph.lineIndex, glyph.lineCount];
  const [index, count] = by === "word" ? [glyph.wordIndex, glyph.wordCount] : [glyph.visibleIndex, glyph.visibleCount];
  return index < 0 ? null : [index, count];
}

const shuffles = new Map<string, Int32Array>();

/** The rank of each of `count` units in a shuffled order, the same for the same seed. */
function shuffled(count: number, seed: number): Int32Array {
  const key = `${count}:${seed}`;
  let ranks = shuffles.get(key);
  if (!ranks) {
    // mulberry32
    let state = (seed * 0x9e3779b9) >>> 0;
    const random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    ranks = new Int32Array(count);
    order.forEach((unit, rank) => {
      ranks![unit] = rank;
    });
    if (shuffles.size >= 64) shuffles.delete(shuffles.keys().next().value!);
    shuffles.set(key, ranks);
  }
  return ranks;
}

/** How many staggers after the first unit a unit starts. */
function rankOf(index: number, count: number, order: AnimationOrder, seed: number): number {
  const fromMiddle = Math.floor(Math.abs(index - (count - 1) / 2));
  switch (order) {
    case "backward":
      return count - 1 - index;
    case "center":
      return fromMiddle;
    case "edges":
      return Math.floor((count - 1) / 2) - fromMiddle;
    case "random":
      return shuffled(count, seed)[index]!;
    default:
      return index;
  }
}

/** The last rank of `count` units. */
function lastRank(count: number, order: AnimationOrder): number {
  if (count <= 0) return 0;
  return order === "center" || order === "edges" ? Math.floor((count - 1) / 2) : count - 1;
}

/**
 * How far a glyph's unit is through its animation at `time`: `0` before it starts, `1` once it is done, linear in
 * between. Whitespace in `"glyph"` mode is always done. Use it to build animations of your own.
 *
 * @example glyphTransform: (glyph) => ({ opacity: unitProgress(glyph, frame, { by: "word", stagger: 6, duration: 8 }) })
 */
export function unitProgress(glyph: GlyphContext, time: number, timing: StaggerTiming): number {
  const { by = "glyph", delay = 0, stagger = 0, duration, order = "forward", seed = 0 } = timing;
  const unit = unitOf(glyph, by);
  if (!unit) return 1;
  const start = delay + stagger * rankOf(unit[0], unit[1], order, seed);
  if (duration <= 0) return time >= start ? 1 : 0;
  return Math.min(1, Math.max(0, (time - start) / duration));
}

/**
 * When the last unit finishes: the length of the animation. Pass any `GlyphContext` of the caption (they all hold the
 * counts), e.g. from `createGlyphContexts(layoutText(props))`.
 */
export function animationDuration(
  timing: StaggerTiming,
  counts: Pick<GlyphContext, "visibleCount" | "wordCount" | "lineCount">,
): number {
  const { by = "glyph", delay = 0, stagger = 0, duration, order = "forward" } = timing;
  const count =
    by === "text" ? 1 : by === "line" ? counts.lineCount : by === "word" ? counts.wordCount : counts.visibleCount;
  return delay + stagger * lastRank(count, order) + Math.max(0, duration);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpTint(from: ColorValue | undefined, to: ColorValue | undefined, t: number): number {
  return mixTints(tintOf(from), tintOf(to), t);
}

const NUMBERS = [
  ["scale", 1],
  ["scaleX", 1],
  ["scaleY", 1],
  ["rotation", 0],
  ["skewX", 0],
  ["skewY", 0],
  ["opacity", 1],
] as const;

/**
 * The state `t` of the way from `from` to `to` (`t` eased) at the font size `em`; `visible` switches as soon as
 * `progress` leaves 0.
 */
function between(from: GlyphKeyframe, to: GlyphKeyframe, t: number, progress: number, em: number): GlyphTransform {
  const result: GlyphTransform = {};
  for (const field of ["x", "y"] as const) {
    if (from[field] !== undefined || to[field] !== undefined)
      result[field] = lerp(resolveLength(from[field] ?? 0, em), resolveLength(to[field] ?? 0, em), t);
  }
  for (const [field, rest] of NUMBERS) {
    if (from[field] !== undefined || to[field] !== undefined)
      result[field] = lerp(from[field] ?? rest, to[field] ?? rest, t);
  }
  const visible = progress > 0 ? to.visible : from.visible;
  if (visible !== undefined) result.visible = visible;
  if (from.tint !== undefined || to.tint !== undefined) result.tint = lerpTint(from.tint, to.tint, t);
  if (from.layers || to.layers) {
    const layers: Record<string, LayerTransform> = {};
    for (const key of new Set([...Object.keys(from.layers ?? {}), ...Object.keys(to.layers ?? {})])) {
      const a = from.layers?.[key] ?? {};
      const b = to.layers?.[key] ?? {};
      const layer: LayerTransform = {};
      if (a.opacity !== undefined || b.opacity !== undefined) layer.opacity = lerp(a.opacity ?? 1, b.opacity ?? 1, t);
      if (a.tint !== undefined || b.tint !== undefined) layer.tint = lerpTint(a.tint, b.tint, t);
      const layerVisible = progress > 0 ? b.visible : a.visible;
      if (layerVisible !== undefined) layer.visible = layerVisible;
      layers[key] = layer;
    }
    result.layers = layers;
  }
  return result;
}

const isEmpty = (keyframe: GlyphKeyframe) => Object.values(keyframe).every((value) => value === undefined);

/**
 * Animates every glyph from `from` to `to`, unit by unit: a typewriter, a word-by-word fade, lines sliding in. Returns
 * a function of the time that gives the `glyphTransform` of that moment. A glyph at rest (`to` reached with an empty
 * `to`) gets no transform, so a finished animation costs nothing.
 *
 * @example
 * const rise = animateText({ by: "word", stagger: 6, duration: 12, from: { y: 24, opacity: 0 } });
 * <Text text="…" glyphTransform={rise(frame)} />
 */
export function animateText(animation: TextAnimation): TextAnimationFn {
  const { from = {}, to = {}, easing = easings.easeOutCubic, origin, direction = "in" } = animation;
  const [start, end] = direction === "in" ? [from, to] : [to, from];
  const atRest = (progress: number) =>
    direction === "in" ? progress >= 1 && isEmpty(to) : progress <= 0 && isEmpty(to);
  return (time) => (glyph) => {
    const progress = unitProgress(glyph, time, animation);
    if (atRest(progress)) return undefined;
    const transform = between(start, end, easing(progress), progress, glyph.fontSize);
    if (origin) transform.origin = origin;
    return transform;
  };
}

/**
 * One glyph transform made of several, e.g. an entrance plus a wave: offsets, rotations and skews add up, scales,
 * opacities and tints multiply, and a glyph is visible only if every transform keeps it visible. The first `origin`
 * wins.
 */
export function combineGlyphTransforms(...transforms: (GlyphTransformFn | undefined)[]): GlyphTransformFn {
  return (glyph) => {
    let result: GlyphTransform | undefined;
    for (const fn of transforms) {
      const t = fn?.(glyph);
      if (!t) continue;
      result = result ? combine(result, t) : { ...t };
    }
    return result;
  };
}

function combine(a: GlyphTransform, b: GlyphTransform): GlyphTransform {
  const result: GlyphTransform = { ...a };
  for (const field of ["x", "y", "rotation", "skewX", "skewY"] as const) {
    if (b[field] !== undefined) result[field] = (a[field] ?? 0) + b[field];
  }
  for (const field of ["scale", "scaleX", "scaleY", "opacity"] as const) {
    if (b[field] !== undefined) result[field] = (a[field] ?? 1) * b[field];
  }
  if (b.visible !== undefined) result.visible = (a.visible ?? true) && b.visible;
  if (b.tint !== undefined) result.tint = multiplyTints(tintOf(a.tint), tintOf(b.tint));
  if (result.origin === undefined && b.origin !== undefined) result.origin = b.origin;
  if (b.layers) {
    const layers: Record<string, LayerTransform> = { ...a.layers };
    for (const [key, layer] of Object.entries(b.layers)) {
      const prior = layers[key];
      if (!prior) {
        layers[key] = layer;
        continue;
      }
      const merged: LayerTransform = { ...prior };
      if (layer.opacity !== undefined) merged.opacity = (prior.opacity ?? 1) * layer.opacity;
      if (layer.tint !== undefined) merged.tint = multiplyTints(tintOf(prior.tint), tintOf(layer.tint));
      if (layer.visible !== undefined) merged.visible = (prior.visible ?? true) && layer.visible;
      layers[key] = merged;
    }
    result.layers = layers;
  }
  return result;
}

/** Options of the entrance presets: their timing and easing, with defaults in frames at 30 fps. */
export type AnimationPresetOptions = Partial<
  Pick<TextAnimation, keyof StaggerTiming | "easing" | "origin" | "direction">
>;

/** Fades each unit in (or out with `direction: "out"`). Defaults: by glyph, 2 frames apart, 10 frames each. */
export function fadeIn(options: AnimationPresetOptions = {}): TextAnimationFn {
  return animateText({ stagger: 2, duration: 10, ...options, from: { opacity: 0 } });
}

/** Shows each unit at once, one after another. Defaults: by glyph, 2 frames apart. */
export function typewriter(options: Omit<AnimationPresetOptions, "duration" | "easing"> = {}): TextAnimationFn {
  return animateText({ stagger: 2, ...options, duration: 0, from: { visible: false } });
}

/** Scales each unit up from nothing with a slight overshoot. Defaults: by glyph, 2 frames apart, 12 frames each. */
export function popIn(options: AnimationPresetOptions = {}): TextAnimationFn {
  return animateText({
    stagger: 2,
    duration: 12,
    easing: easings.easeOutBack,
    ...options,
    from: { scale: 0, opacity: 0 },
  });
}

/**
 * Slides each unit in from `offset` away (px, or `{ em }` of the glyph's font size) while fading it in. Defaults: by
 * glyph, from 40 px below, 2 frames apart, 14 frames each.
 */
export function slideIn(
  options: AnimationPresetOptions & { offset?: readonly [x: Length, y: Length] } = {},
): TextAnimationFn {
  const { offset = [0, 40], ...rest } = options;
  return animateText({ stagger: 2, duration: 14, ...rest, from: { x: offset[0], y: offset[1], opacity: 0 } });
}

/**
 * Drops each unit from `height` above (px, or `{ em }` of the glyph's font size) with a bounce. Defaults: by glyph,
 * from 80 px, 3 frames apart, 20 frames each.
 */
export function dropIn(options: AnimationPresetOptions & { height?: Length } = {}): TextAnimationFn {
  const { height = 80, ...rest } = options;
  return animateText({
    stagger: 3,
    duration: 20,
    easing: easings.easeOutBounce,
    ...rest,
    from: { y: typeof height === "number" ? -height : { em: -height.em }, opacity: 0 },
  });
}

/** Options of `wave()`. */
export interface WaveOptions {
  /** Default: `"glyph"`. */
  by?: AnimationUnit;
  /** How far units move up and down, in px or `{ em }` of the glyph's font size. Default: `10`. */
  amplitude?: Length;
  /** Time of one wave. Default: `60`. */
  period?: number;
  /** How far behind the previous one each unit is, in waves (`1` = a whole wave). Default: `0.08`. */
  lag?: number;
}

/** Bobs units up and down in a wave that runs along the text, forever. */
export function wave(options: WaveOptions = {}): TextAnimationFn {
  const { by = "glyph", amplitude = 10, period = 60, lag = 0.08 } = options;
  return (time) => (glyph) => {
    const unit = unitOf(glyph, by);
    if (!unit) return undefined;
    return { y: Math.sin(2 * Math.PI * (time / period - unit[0] * lag)) * resolveLength(amplitude, glyph.fontSize) };
  };
}

/** Options of `shake()`. */
export interface ShakeOptions {
  /** Default: `"glyph"`. */
  by?: AnimationUnit;
  /** Largest offset, in px or `{ em }` of the glyph's font size. Default: `4`. */
  amount?: Length;
  /** Largest rotation in degrees. Default: `6`. */
  rotation?: number;
  /** Time each pose is held. Default: `2`. */
  interval?: number;
  /** Changes the poses. Default: `0`. */
  seed?: number;
}

/** A pseudo-random number in -1 … 1, the same for the same input. */
function noise(input: number): number {
  const value = Math.sin(input * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

/** Jitters units in random poses, forever, e.g. for a startled caption. Each unit moves on its own. */
export function shake(options: ShakeOptions = {}): TextAnimationFn {
  const { by = "glyph", amount = 4, rotation = 6, interval = 2, seed = 0 } = options;
  return (time) => (glyph) => {
    const unit = unitOf(glyph, by);
    if (!unit) return undefined;
    const base = unit[0] * 31 + Math.floor(time / Math.max(interval, 1e-6)) * 7 + seed * 101;
    const offset = resolveLength(amount, glyph.fontSize);
    return { x: noise(base) * offset, y: noise(base + 1) * offset, rotation: noise(base + 2) * rotation };
  };
}
