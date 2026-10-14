import {
  animateText,
  bevel,
  combineGlyphTransforms,
  easings,
  extrude,
  fadeIn,
  fill,
  type GlyphContext,
  glow,
  linearGradient,
  marker,
  shadow,
  slideIn,
  stroke,
  type TextStyle,
  typewriter,
  wave,
  wipeClip,
} from "tellu";
import type { CaptionSpec } from "./caption";

export const FPS = 30;

export const FONTS = {
  mincho: "Shippori Mincho B1",
  gothic: "Zen Kaku Gothic New",
  display: "Unbounded",
  dot: "DotGothic16",
} as const;

const PAPER = "#f4efe6";
const MAGENTA = "#ff3d8b";
const CYAN = "#7fe9ff";
const AMBER = "#ffb547";
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
          glow({ color: MAGENTA, stroke: 14, blur: 36, opacity: 0.85 }),
          glow({ color: "#ff8fc0", stroke: 4, blur: 8 }),
          stroke(2, "#ffc6dc"),
          fill("#fff6fa"),
        ],
      },
    },
    animate: (frame) => ({
      glyphTransform: (glyph) => ({ opacity: ignite(frame, 12 + glyph.visibleIndex * 10, glyph.visibleIndex) }),
    }),
  },
  {
    host: "opening-episode",
    props: {
      text: "EP.07 ／ SHIBUYA TO YOYOGI",
      style: { fontFamily: FONTS.dot, fontSize: 30, letterSpacing: { em: 0.08 }, layers: [fill(MAGENTA)] },
    },
    animate: (frame) => ({ glyphTransform: fadeIn({ delay: 50, stagger: 1 })(frame) }),
  },
  {
    host: "opening-latin",
    props: {
      text: "TOKYO\nNIGHT WALK",
      style: {
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 92,
        lineHeight: 1.05,
        letterSpacing: { em: 0.04 },
        layers: [glow({ color: "#00b7ff", stroke: 2, blur: 18, opacity: 0.6 }), fill(CYAN)],
      },
    },
    animate: (frame) => ({ glyphTransform: typewriter({ delay: 40, stagger: 2 })(frame) }),
  },
  {
    host: "opening-route",
    props: {
      text: "渋谷から代々木公園まで、終電のあとの 5.2 km。",
      style: { fontFamily: FONTS.gothic, fontWeight: 500, fontSize: 34, layers: [fill("#cfcae6")] },
    },
    animate: (frame) => ({ glyphTransform: fadeIn({ delay: 72, stagger: 1, duration: 12 })(frame) }),
  },
];

const startTime = 23 * 3600 + 41 * 60 + 7;

function clock(frame: number): string {
  const seconds = startTime + Math.floor(frame / FPS);
  return [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

const chapter: CaptionSpec[] = [
  {
    host: "chapter-number",
    props: {
      text: "01",
      style: {
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 320,
        layers: [extrude({ color: INK, depth: 26, angle: 135 }), fill(PAPER)],
      },
    },
    animate: (frame) => ({
      glyphTransform: slideIn({ offset: [{ em: -0.5 }, 0], delay: 8, stagger: 5, duration: 18 })(frame),
    }),
  },
  {
    host: "chapter-kanji",
    anchor: [0.5, 0],
    props: {
      text: "第一章",
      writingMode: "vertical-rl",
      style: {
        fontFamily: FONTS.mincho,
        fontWeight: 800,
        fontSize: 64,
        letterSpacing: { em: 0.3 },
        layers: [fill(INK)],
      },
    },
    animate: (frame) => ({ glyphTransform: fadeIn({ delay: 20, stagger: 4, duration: 12 })(frame) }),
  },
  {
    host: "chapter-roman",
    props: {
      text: "SHIBUYA — UDAGAWACHO",
      style: {
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 28,
        letterSpacing: { em: 0.32 },
        layers: [fill(AMBER)],
      },
    },
    animate: (frame) => ({ glyphTransform: fadeIn({ delay: 22, stagger: 1 })(frame) }),
  },
  {
    host: "chapter-place",
    props: {
      text: "渋谷・宇田川町",
      style: {
        fontFamily: FONTS.gothic,
        fontWeight: 900,
        fontSize: 124,
        layers: [shadow({ offset: [0, 10], blur: 22, color: "rgba(0,0,0,0.45)" }), fill(PAPER)],
      },
    },
    animate: (frame) => ({
      glyphTransform: slideIn({
        offset: [0, { em: 0.45 }],
        delay: 14,
        stagger: 3,
        duration: 16,
        origin: [0.5, 1],
      })(frame),
    }),
  },
  {
    host: "chapter-body",
    props: {
      text: "センター街を抜けて、ゆるい坂をのぼる。\n終電のあとの街は、昼より少しだけ広い。",
      style: { fontFamily: FONTS.gothic, fontWeight: 500, fontSize: 40, lineHeight: 1.75, layers: [fill("#cfcae6")] },
    },
    animate: (frame) => ({
      glyphTransform: animateText({
        by: "line",
        delay: 34,
        stagger: 8,
        duration: 18,
        from: { y: 18, opacity: 0 },
      })(frame),
    }),
  },
  {
    host: "chapter-clock",
    charset: "0123456789:",
    props: {
      text: [{ text: "● REC  ", style: { layers: [fill(MAGENTA)] } }, clock(0)],
      style: {
        fontFamily: FONTS.dot,
        fontSize: 54,
        layers: [glow({ color: "#00b7ff", stroke: 2, blur: 12, opacity: 0.7 }), fill(CYAN)],
      },
    },
    animate: (frame) => ({
      text: [{ text: "● REC  ", style: { layers: [fill(MAGENTA)] } }, clock(frame)],
      glyphTransform: (glyph: GlyphContext) => {
        const enter = fadeIn({ delay: 48, stagger: 1 })(frame)(glyph);
        const blink = glyph.runIndex === 0 && glyph.visibleIndex === 0 && Math.floor(frame / 15) % 2 === 1;
        return blink ? { ...enter, opacity: 0.25 * (enter?.opacity ?? 1) } : enter;
      },
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
  {
    host: "monologue-side",
    anchor: [0.5, 0],
    props: {
      text: "午前零時の独白",
      writingMode: "vertical-rl",
      style: {
        fontFamily: FONTS.mincho,
        fontWeight: 800,
        fontSize: 46,
        letterSpacing: { em: 0.25 },
        layers: [shadow({ offset: [0, 4], blur: 10, color: "rgba(0,0,0,0.5)" }), fill(PAPER)],
      },
    },
    animate: (frame) => ({ glyphTransform: fadeIn({ delay: 4, stagger: 3, duration: 14 })(frame) }),
  },
  {
    host: "monologue-track",
    props: {
      text: "TRACK 02 ─ MONOLOGUE",
      style: { fontFamily: FONTS.dot, fontSize: 28, letterSpacing: { em: 0.1 }, layers: [fill(CYAN)] },
    },
    animate: (frame) => ({ glyphTransform: typewriter({ stagger: 1 })(frame) }),
  },
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
  {
    host: "neon-hours",
    anchor: [0.5, 0],
    props: {
      text: "OPEN UNTIL 5 AM",
      style: {
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 40,
        letterSpacing: { em: 0.3 },
        layers: [glow({ color: MAGENTA, stroke: 6, blur: 18 }), fill("#ffd3e5")],
      },
    },
    animate: (frame) => ({ glyphTransform: () => ({ opacity: ignite(frame, 44, 31) }) }),
  },
  {
    host: "neon-menu",
    anchor: [0.5, 0],
    props: {
      text: [
        {
          text: "本日のおすすめ",
          style: { layers: [fill(INK)], decorations: [marker(AMBER, { inset: [0, 1], padding: [12, 6] })] },
        },
        "　ナポリタン　¥850",
      ],
      style: { fontFamily: FONTS.gothic, fontWeight: 700, fontSize: 44, layers: [fill(PAPER)] },
    },
    animate: (frame) => ({
      glyphTransform: fadeIn({ delay: 56, stagger: 1, duration: 8 })(frame),
      clip: (layout) => wipeClip(layout, (frame - 56) / 24, { by: "glyph" }),
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
          shadow({ offset: [0, 8], blur: 24, color: "rgba(12,6,40,0.55)" }),
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
  {
    host: "outro-latin",
    anchor: [0.5, 0],
    props: {
      text: "SEE YOU TOMORROW NIGHT",
      style: {
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: { em: 0.45 },
        layers: [fill("#ffcf9e")],
      },
    },
    animate: (frame) => ({ glyphTransform: typewriter({ delay: 34, stagger: 1 })(frame) }),
  },
  {
    host: "outro-credit",
    anchor: [0.5, 1],
    props: {
      text: "captions: tellu　／　video: HyperFrames",
      style: { fontFamily: FONTS.dot, fontSize: 24, layers: [fill("rgba(255,255,255,0.6)")] },
    },
    animate: (frame) => ({ glyphTransform: fadeIn({ by: "text", delay: 58, duration: 16 })(frame) }),
  },
];

/** The captions of each sub-composition, by its `data-composition-id`. */
export const SCENES: Record<string, CaptionSpec[]> = { opening, chapter, monologue, neon, outro };
