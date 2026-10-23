import {
  bevel,
  combineGlyphTransforms,
  easings,
  extrude,
  fill,
  glow,
  linearGradient,
  shadow,
  slideIn,
  stroke,
  type TextStyle,
  wave,
  wipeClip,
} from "tellu";
import type { CaptionSpec } from "./caption";

export const FPS = 30;

export const FONTS = {
  mincho: "Shippori Mincho B1",
  gothic: "Zen Kaku Gothic New",
  display: "Unbounded",
} as const;

const PAPER = "#f4efe6";
const MAGENTA = "#ff3d8b";
const INK = "#14102e";

/** A number in 0–1, the same for the same input. */
function noise(input: number): number {
  const value = Math.sin(input * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const UNLIT = 0.07;

/** Opacity of a neon tube switched on at `start`: dim, a few stutters, then lit. */
function ignite(frame: number, start: number, seed: number): number {
  const elapsed = frame - start;
  if (elapsed < 0) return UNLIT;
  if (elapsed >= 14) return 1;
  return noise(seed * 17 + Math.floor(elapsed / 2)) > 0.35 ? 1 : UNLIT;
}

/** Fades a caption in over `fade` frames from `from` and out before `to`, and hides it outside. */
function shownBetween(frame: number, from: number, to: number, fade = 6) {
  if (frame < from || frame >= to) return { visible: false };
  return { opacity: Math.min(1, (frame - from) / fade, (to - frame) / fade) };
}

const opening: CaptionSpec[] = [
  {
    host: "opening-title",
    anchor: [0.5, 0],
    props: {
      text: "夜を歩く",
      writingMode: "vertical-rl",
      style: {
        fontFamily: FONTS.mincho,
        fontWeight: 800,
        fontSize: 180,
        letterSpacing: { em: 0.12 },
        layers: [
          glow({ color: MAGENTA, stroke: 16, blur: 36, opacity: 0.85 }),
          stroke(12, MAGENTA),
          stroke(6, "#ffc6dc"),
          fill("#fff6fa"),
        ],
      },
    },
    animate: (frame) => ({
      glyphTransform: (glyph) => ({ opacity: ignite(frame, 12 + glyph.visibleIndex * 10, glyph.visibleIndex) }),
    }),
  },
];

const chapter: CaptionSpec[] = [
  {
    host: "chapter-number",
    anchor: [0.5, 0.5],
    props: {
      text: "01",
      style: {
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 320,
        layers: [extrude({ color: INK, depth: 26, angle: 135, stroke: 12 }), stroke(12, INK), fill(PAPER)],
      },
    },
    animate: (frame) => ({
      glyphTransform: slideIn({ offset: [{ em: -0.5 }, 0], delay: 8, stagger: 5, duration: 18 })(frame),
    }),
  },
];

const lineStyle: Partial<TextStyle> = { fontFamily: FONTS.gothic, fontWeight: 700, fontSize: 62 };

/** A subtitle sung karaoke-style: a dim copy, and a lit copy revealed by a wipe along its lines. */
function karaoke(id: string, text: string, from: number, to: number, wipe: readonly [number, number]): CaptionSpec[] {
  const shared = { host: id, anchor: [0.5, 1] as const };
  const progress = (frame: number) => (frame - wipe[0]) / (wipe[1] - wipe[0]);
  return [
    {
      ...shared,
      props: {
        text,
        style: { ...lineStyle, layers: [stroke(10, "rgba(8,6,26,0.9)"), fill("#5e5a85")] },
      },
      animate: (frame) => ({ glyphTransform: () => shownBetween(frame, from, to) }),
    },
    {
      ...shared,
      props: {
        text,
        style: {
          ...lineStyle,
          layers: [
            glow({ color: MAGENTA, stroke: 12, blur: 20, opacity: 0.7 }),
            stroke(10, "#0b0920"),
            fill(linearGradient(["#ffffff", "#ffc4dd"], { angle: 90 })),
          ],
        },
      },
      animate: (frame) => ({
        glyphTransform: () => shownBetween(frame, from, to),
        clip: (layout) => wipeClip(layout, progress(frame)),
      }),
    },
  ];
}

const monologue: CaptionSpec[] = [
  ...karaoke("monologue-line", "ネオンの海を、泳ぐように歩いた。", 6, 86, [14, 72]),
  ...karaoke("monologue-line", "信号だけが、ずっと青いままだった。", 92, 178, [100, 160]),
];

const BROKEN_TUBE = 3;

const neon: CaptionSpec[] = [
  {
    host: "neon-sign",
    anchor: [0.5, 0.5],
    props: {
      text: "深夜喫茶",
      warp: { style: "arch", bend: 0.24 },
      style: {
        fontFamily: FONTS.gothic,
        fontWeight: 900,
        fontSize: 190,
        letterSpacing: { em: 0.1 },
        layers: [
          glow({ color: "#00c8ff", stroke: 16, blur: 42, opacity: 0.9 }),
          stroke(5, "#c4f7ff"),
          fill(linearGradient(["#ffffff", "#8ff0ff"], { angle: 90 })),
          ...bevel({ highlight: "rgba(255,255,255,0.9)", shadow: "rgba(0,70,100,0.55)", size: 7 }),
        ],
      },
    },
    animate: (frame) => ({
      glyphTransform: (glyph) => {
        const lit = ignite(frame, 8 + glyph.visibleIndex * 6, glyph.visibleIndex + 4);
        const stutter = glyph.visibleIndex === BROKEN_TUBE && noise(Math.floor(frame / 3) + 99) > 0.8;
        return { opacity: stutter ? UNLIT : lit };
      },
    }),
  },
];

const outro: CaptionSpec[] = [
  {
    host: "outro-title",
    anchor: [0.5, 0.5],
    props: {
      text: "また、明日の夜に。",
      style: {
        fontFamily: FONTS.mincho,
        fontWeight: 800,
        fontSize: 132,
        layers: [
          shadow({ offset: [0, 8], blur: 24, stroke: 18, color: "rgba(12,6,40,0.55)" }),
          stroke(18, "#2b1a55"),
          stroke(10, "#ff9a5c"),
          fill(linearGradient(["#fffaf2", "#ffd2a6"], { angle: 90 })),
        ],
      },
    },
    animate: (frame) => ({
      glyphTransform: combineGlyphTransforms(
        slideIn({ offset: [0, { em: 0.3 }], delay: 4, stagger: 3, duration: 20, easing: easings.easeOutBack })(frame),
        wave({ amplitude: 5, period: 80 })(frame),
      ),
    }),
  },
];

/** The captions of each sub-composition, by its `data-composition-id`. */
export const SCENES: Record<string, CaptionSpec[]> = { opening, chapter, monologue, neon, outro };
