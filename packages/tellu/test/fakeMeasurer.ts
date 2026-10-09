import type { FontSpec, Measurer } from "../src/layout/measure";

/** CJK = 1em, space = 0.25em, everything else = 0.5em. */
export const fakeMeasurer: Measurer = {
  measureText(text: string, font: FontSpec) {
    let width = 0;
    for (const char of text) {
      width += /[　-鿿＀-￯]/.test(char) ? 1 : char === " " ? 0.25 : 0.5;
    }
    return width * font.size;
  },
  fontMetrics(font: FontSpec) {
    return { ascent: font.size * 0.8, descent: font.size * 0.2 };
  },
};

/** `fakeMeasurer` with ink: 0.1em of blank space on every side of each glyph, except 。 (ink 0.1–0.4em × -0.3–0.1em). */
export const inkMeasurer: Measurer = {
  ...fakeMeasurer,
  inkBounds(text: string, font: FontSpec) {
    const em = font.size;
    if (text === "。") return { left: 0.1 * em, top: -0.3 * em, right: 0.4 * em, bottom: 0.1 * em };
    return { left: 0.1 * em, top: -0.7 * em, right: fakeMeasurer.measureText(text, font) - 0.1 * em, bottom: 0.1 * em };
  },
};
