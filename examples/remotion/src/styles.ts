import { fill, glow, linearGradient, shadow, stroke, type TextStyle } from "tellu";
import { FONTS } from "./fonts";

type Style = Partial<TextStyle>;

/** Yellow gradient with navy and white outlines, the classic variety-show look. */
export const variety: Style = {
  fontFamily: FONTS.gothic,
  fontWeight: 900,
  fontSize: 120,
  letterSpacing: 2,
  layers: [
    shadow({ color: "rgba(0,0,0,0.45)", offset: [10, 12], blur: 8, stroke: 30 }),
    stroke(30, "#14206b"),
    stroke(16, "#ffffff"),
    fill(linearGradient(["#fffbd1", "#ffe14d", "#ff9d00"], { scope: "line" })),
  ],
};

/** Heavy red outline for punchlines (ツッコミ). */
export const punchline: Style = {
  fontFamily: FONTS.heavy,
  fontWeight: 400,
  fontSize: 116,
  scaleX: 0.9,
  letterSpacing: 12,
  layers: [
    shadow({ color: "rgba(80,0,0,0.5)", offset: [6, 8], blur: 4, stroke: 18 }),
    stroke(18, "#ffffff"),
    stroke(10, "#d7001b"),
    fill(linearGradient(["#ffffff", "#ffd6d6"], { scope: "glyph" })),
  ],
};

/** Soft rounded text with a glow. */
export const cute: Style = {
  fontFamily: FONTS.rounded,
  fontWeight: 900,
  fontSize: 84,
  layers: [
    glow({ color: "#ff8fd3", stroke: 18, blur: 16, opacity: 0.9 }),
    stroke(14, "#ffffff"),
    stroke(7, "#ff5fae"),
    fill("#ffffff"),
  ],
};

/** Small annotation (※…) in the cute palette, with outlines scaled to its size. */
export const note: Style = {
  fontFamily: FONTS.rounded,
  fontWeight: 900,
  fontSize: 42,
  letterSpacing: 1,
  layers: [
    glow({ color: "#ff8fd3", stroke: 8, blur: 10, opacity: 0.8 }),
    stroke(7, "#ffffff"),
    stroke(3.5, "#ff5fae"),
    fill("#ffffff"),
  ],
};

export const subtitle: Style = {
  fontFamily: FONTS.gothic,
  fontWeight: 900,
  fontSize: 64,
  lineHeight: 1.3,
  layers: [
    shadow({ offset: [0, 4], blur: 6, stroke: 10, color: "rgba(0,0,0,0.6)" }),
    stroke(10, "#000000"),
    fill("#ffffff"),
  ],
};

export const speakerColors = {
  A: "#ffd400",
  B: "#4ad6ff",
} as const;

export const lowerThirdName: Style = {
  fontFamily: FONTS.gothic,
  fontWeight: 900,
  fontSize: 76,
  letterSpacing: { em: 0.08 },
  layers: [fill("#ffffff")],
};

export const lowerThirdTitle: Style = {
  fontFamily: FONTS.gothic,
  fontWeight: 500,
  fontSize: 36,
  letterSpacing: { em: 0.05 },
  layers: [fill("#0b2a4a")],
};
