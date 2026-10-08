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
