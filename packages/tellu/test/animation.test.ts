import { describe, expect, test } from "bun:test";
import {
  animateText,
  animationDuration,
  combineGlyphTransforms,
  easings,
  fadeIn,
  shake,
  typewriter,
  unitProgress,
  wave,
} from "../src/animation";
import { layoutText } from "../src/layout/layout";
import type { GlyphContext } from "../src/style/types";
import { createGlyphContexts } from "../src/TextNode";
import { fakeMeasurer } from "./fakeMeasurer";

// 「あい う」 on one line, then 「え」: visible glyphs あいうえ, words あい / う / え.
const glyphs = createGlyphContexts(layoutText({ text: "あい う\nえ", style: { fontSize: 10 } }, fakeMeasurer));
const visible = glyphs.filter((glyph) => !glyph.isWhitespace);
const [a, i, , u, e] = glyphs as [GlyphContext, GlyphContext, GlyphContext, GlyphContext, GlyphContext];

describe("unitProgress", () => {
  test("staggers glyphs, words and lines", () => {
    const timing = { stagger: 10, duration: 10 };
    expect(visible.map((glyph) => unitProgress(glyph, 15, timing))).toEqual([1, 0.5, 0, 0]);
    expect(visible.map((glyph) => unitProgress(glyph, 15, { ...timing, by: "line" }))).toEqual([1, 1, 1, 0.5]);
    expect(unitProgress(e, 25, { ...timing, by: "word", delay: 0 })).toBe(0.5);
    expect(unitProgress(e, 0, { ...timing, by: "text" })).toBe(0);
  });

  test("starts at the delay and switches at once without a duration", () => {
    expect(unitProgress(a, 4, { delay: 5, duration: 0 })).toBe(0);
    expect(unitProgress(a, 5, { delay: 5, duration: 0 })).toBe(1);
  });

  test("orders units backward, from the center or from the edges", () => {
    const rank = (order: "backward" | "center" | "edges") =>
      visible.map((glyph) => 1 - unitProgress(glyph, 1, { stagger: 1, duration: 1, order }));
    expect(rank("backward")).toEqual([1, 1, 1, 0]);
    // Four glyphs: the middle two start first, then the outer two.
    expect(rank("center")).toEqual([1, 0, 0, 1]);
    expect(rank("edges")).toEqual([0, 1, 1, 0]);
  });

  test("shuffles units the same way for the same seed", () => {
    const starts = (seed: number) =>
      visible.map((glyph) => {
        for (let t = 0; t < 10; t++)
          if (unitProgress(glyph, t, { stagger: 1, duration: 0, order: "random", seed }) === 1) return t;
        return -1;
      });
    expect(starts(1).toSorted()).toEqual([0, 1, 2, 3]);
    expect(starts(1)).toEqual(starts(1));
  });

  test("leaves whitespace done", () => {
    expect(unitProgress(glyphs[2]!, 0, { stagger: 10, duration: 10 })).toBe(1);
  });
});

describe("animationDuration", () => {
  test("is when the last unit finishes", () => {
    expect(animationDuration({ stagger: 2, duration: 10, delay: 5 }, a)).toBe(5 + 2 * 3 + 10);
    expect(animationDuration({ by: "word", stagger: 2, duration: 10 }, a)).toBe(2 * 2 + 10);
    expect(animationDuration({ stagger: 2, duration: 10, order: "center" }, a)).toBe(2 * 1 + 10);
  });
});

describe("animateText", () => {
  const slide = animateText({ stagger: 10, duration: 10, easing: easings.linear, from: { y: 20, opacity: 0 } });

  test("goes from `from` to the layout's state, and leaves finished glyphs alone", () => {
    expect(slide(5)(a)).toEqual({ y: 10, opacity: 0.5 });
    expect(slide(0)(i)).toEqual({ y: 20, opacity: 0 });
    expect(slide(30)(a)).toBeUndefined();
  });

  test("plays backward with direction: out", () => {
    const out = animateText({ duration: 10, easing: easings.linear, from: { opacity: 0 }, direction: "out" });
    expect(out(0)(a)).toBeUndefined();
    expect(out(5)(a)).toEqual({ opacity: 0.5 });
    expect(out(10)(a)).toEqual({ opacity: 0 });
  });

  test("switches visibility as a unit starts", () => {
    const type = typewriter({ stagger: 1 });
    expect(type(0)(a)).toBeUndefined();
    expect(type(0)(i)).toEqual({ visible: false });
    expect(type(1)(i)).toBeUndefined();
  });

  test("blends tints and layer changes", () => {
    const glow = animateText({
      duration: 10,
      easing: easings.linear,
      from: { tint: "#000000", layers: { glow: { opacity: 0 } } },
      to: { tint: "#ffffff", layers: { glow: { opacity: 1 } } },
    });
    expect(glow(5)(a)).toEqual({ tint: 0x808080, layers: { glow: { opacity: 0.5 } } });
  });

  test("adds the origin", () => {
    expect(fadeIn({ origin: [0.5, 1], duration: 10 })(0)(a)).toMatchObject({ origin: [0.5, 1] });
  });
});

describe("combineGlyphTransforms", () => {
  test("adds offsets and multiplies scales, opacities and tints", () => {
    const combined = combineGlyphTransforms(
      () => ({ y: 4, scale: 2, opacity: 0.5, tint: "#ff0000", origin: [0, 0] }),
      undefined,
      () => ({ y: 6, scale: 1.5, opacity: 0.5, tint: "#808080", visible: false, origin: [1, 1] }),
    );
    expect(combined(a)).toEqual({ y: 10, scale: 3, opacity: 0.25, tint: 0x800000, visible: false, origin: [0, 0] });
  });

  test("merges layer changes", () => {
    const combined = combineGlyphTransforms(
      () => ({ layers: { glow: { opacity: 0.5 } } }),
      () => ({ layers: { glow: { opacity: 0.5, visible: true }, 0: { visible: false } } }),
    );
    expect(combined(a)).toEqual({ layers: { glow: { opacity: 0.25, visible: true }, 0: { visible: false } } });
  });

  test("returns nothing when nothing moves", () => {
    expect(combineGlyphTransforms(() => undefined)(a)).toBeUndefined();
  });
});

describe("loops", () => {
  test("wave lags each unit behind the one before", () => {
    const at = wave({ amplitude: 10, period: 4, lag: 0.25 })(1);
    expect(at(a)!.y).toBeCloseTo(10);
    expect(at(i)!.y).toBeCloseTo(0);
    expect(at(glyphs[2]!)).toBeUndefined();
  });

  test("shake holds a pose for an interval and stays in bounds", () => {
    const pose = (time: number) => shake({ amount: 4, interval: 2 })(time)(u)!;
    expect(pose(0)).toEqual(pose(1));
    expect(pose(0)).not.toEqual(pose(2));
    expect(Math.abs(pose(5).x!)).toBeLessThanOrEqual(4);
  });
});
