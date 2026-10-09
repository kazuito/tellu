import { describe, expect, test } from "bun:test";
import { type Layout, layoutText } from "../src/layout/layout";
import type { LayoutOptions } from "../src/style/types";
import { fakeMeasurer, inkMeasurer } from "./fakeMeasurer";

const style = { fontSize: 10, lineHeight: 1 };
const vertical = (options: Omit<LayoutOptions, "writingMode"> & { writingMode?: LayoutOptions["writingMode"] }) =>
  layoutText({ writingMode: "vertical-rl", ...options, style: { ...style, ...options.style } }, fakeMeasurer);
const lineTexts = (result: Layout) =>
  result.lines.map((line) =>
    result.glyphs
      .slice(line.start, line.end)
      .map((glyph) => glyph.text)
      .join(""),
  );
const pick = (result: Layout, keys: readonly (keyof Layout["glyphs"][number])[]) =>
  result.glyphs.map((glyph) => keys.map((key) => glyph[key]));

describe("writing mode", () => {
  test("vertical-rl stacks lines right to left", () => {
    const result = vertical({ text: "あい\nう" });
    expect([result.width, result.height]).toEqual([20, 20]);
    expect(result.lines.map((line) => line.blockStart)).toEqual([10, 0]);
    // Upright glyphs: centered on the line, em box (0.8 / 0.2 here) at the top of the cell.
    expect(pick(result, ["x", "y", "rotation"])).toEqual([
      [10, 8, 0],
      [10, 18, 0],
      [0, 8, 0],
    ]);
    expect(result.glyphs[1]!.box).toEqual({ x: 10, y: 10, width: 10, height: 10 });
  });

  test("vertical-lr stacks lines left to right", () => {
    const result = vertical({ text: "あい\nう", writingMode: "vertical-lr" });
    expect(result.lines.map((line) => line.blockStart)).toEqual([0, 10]);
    expect(result.glyphs[2]!.x).toBe(10);
  });

  test("maxHeight is the line length", () => {
    const result = vertical({ text: "あいうえお", maxHeight: 20 });
    expect(lineTexts(result)).toEqual(["あい", "うえ", "お"]);
    expect([result.width, result.height]).toEqual([30, 20]);
  });

  test("maxWidth does not wrap vertical text", () => {
    expect(lineTexts(vertical({ text: "あいうえお", maxWidth: 20 }))).toEqual(["あいうえお"]);
  });

  test("shrink fits both the line length and the block size", () => {
    const result = vertical({ text: "あいうえ\nあいうえ", maxHeight: 40, maxWidth: 10, overflow: "shrink" });
    expect(result.fontScale).toBeCloseTo(0.5, 2);
    expect(result.width).toBeLessThanOrEqual(10.01);
  });

  test("maxHeight bounds shrink in horizontal text", () => {
    const result = layoutText({ text: "あ\nい", style, maxHeight: 10, overflow: "shrink" }, fakeMeasurer);
    expect(result.fontScale).toBeCloseTo(0.5, 2);
  });

  test("kinsoku and hanging punctuation apply along the column", () => {
    expect(lineTexts(vertical({ text: "あいう」えお", maxHeight: 30 }))).toEqual(["あい", "う」え", "お"]);
    expect(lineTexts(vertical({ text: "あいう。えお", maxHeight: 30 }))).toEqual(["あいう。", "えお"]);
  });

  test("align end and center along the column", () => {
    expect(vertical({ text: "あ", maxHeight: 50, align: "bottom" }).glyphs[0]!.y).toBe(48);
    expect(vertical({ text: "あ", maxHeight: 50, align: "end" }).lines[0]!.inlineStart).toBe(40);
    expect(vertical({ text: "あ", maxHeight: 50, align: "center" }).lines[0]!.inlineStart).toBe(20);
  });

  test("the content box runs down the column", () => {
    const result = vertical({ text: "あい\nう" });
    expect(result.lines[0]!.contentBox).toEqual({ x: 10, y: 0, width: 10, height: 20 });
  });

  test("squeeze compresses columns vertically", () => {
    const result = vertical({ text: "あいうえ", maxHeight: 20, wrap: "none", overflow: "squeeze" });
    expect(result.glyphs[0]!.scaleY).toBe(0.5);
    expect(result.glyphs[0]!.scaleX).toBe(1);
    expect(result.glyphs[1]!.box.y).toBe(5);
  });
});

describe("text orientation", () => {
  test("mixed turns latin sideways", () => {
    const result = vertical({ text: "aあ" });
    const [latin, kana] = result.glyphs;
    expect(latin!.rotation).toBe(90);
    expect(latin!.advance).toBe(5);
    // The em box center (0.3em above the baseline) sits on the central baseline.
    expect([latin!.x, latin!.y]).toEqual([2, 0]);
    expect(kana!.y).toBe(13);
  });

  test("upright keeps latin upright with a 1em advance", () => {
    const result = vertical({ text: "ab", style: { textOrientation: "upright" } });
    expect(pick(result, ["rotation", "advance", "x"])).toEqual([
      [0, 10, 2.5],
      [0, 10, 2.5],
    ]);
  });

  test("sideways turns CJK too", () => {
    expect(vertical({ text: "あ", style: { textOrientation: "sideways" } }).glyphs[0]!.rotation).toBe(90);
  });

  test("brackets and the long vowel mark turn, punctuation moves to the top right", () => {
    const result = vertical({ text: "「ー」。" });
    expect(result.glyphs.map((glyph) => glyph.rotation)).toEqual([90, 90, 90, 0]);
    const period = result.glyphs[3]!;
    expect([period.x, period.y]).toEqual([6, 32]);
  });

  test("small kana move by a fixed amount", () => {
    const result = vertical({ text: "っ" });
    expect(result.glyphs[0]!.x).toBeCloseTo(1.2);
    expect(result.glyphs[0]!.y).toBeCloseTo(7.2);
  });

  test("reflects punctuation by its ink when the measurer knows it", () => {
    const result = layoutText(
      { text: "。", writingMode: "vertical-rl", style },
      { ...fakeMeasurer, inkBounds: () => ({ left: 1, top: -3, right: 4, bottom: 0 }) },
    );
    // Ink center (2.5, -1.5) mirrored through the em box center (5, -3).
    expect([result.glyphs[0]!.x, result.glyphs[0]!.y]).toEqual([5, 5]);
  });

  test("only neighbouring sideways glyphs kern", () => {
    const kerning = {
      ...fakeMeasurer,
      measureText: (text: string, font: Parameters<typeof fakeMeasurer.measureText>[1]) =>
        fakeMeasurer.measureText(text, font) - (text.match(/AV|。「/g)?.length ?? 0) * 2,
    };
    const result = layoutText({ text: "AVあ。「", writingMode: "vertical-rl", style }, kerning);
    expect(result.glyphs.map((glyph) => glyph.box.y)).toEqual([0, 3, 8, 18, 28]);
  });
});

describe("text-combine-upright", () => {
  test("combines up to two digits by default", () => {
    const result = vertical({ text: "第12話" });
    expect(result.glyphs.map((glyph) => glyph.text)).toEqual(["第", "12", "話"]);
    expect(pick(result, ["rotation", "advance", "scaleX", "x"])[1]).toEqual([0, 10, 1, 0]);
  });

  test("longer digit runs stay sideways", () => {
    const result = vertical({ text: "2026年" });
    expect(result.glyphs.map((glyph) => [glyph.text, glyph.rotation])).toEqual([
      ["2", 90],
      ["0", 90],
      ["2", 90],
      ["6", 90],
      ["年", 0],
    ]);
  });

  test("digits N and none", () => {
    expect(vertical({ text: "2026", style: { textCombineUpright: "digits 4" } }).glyphs.length).toBe(1);
    expect(vertical({ text: "12", style: { textCombineUpright: "none" } }).glyphs.length).toBe(2);
  });

  test("all condenses a whole run into one em", () => {
    const result = vertical({ text: ["え", { text: "!?!", style: { textCombineUpright: "all" } }] });
    const combined = result.glyphs[1]!;
    expect(combined.text).toBe("!?!");
    expect(combined.scaleX).toBeCloseTo(2 / 3);
    expect(combined.advance).toBe(10);
    expect(combined.x).toBeCloseTo(0);
  });

  test("a combined glyph follows kinsoku by its first character", () => {
    const result = vertical({
      text: ["あいう", { text: "!!", style: { textCombineUpright: "all" } }],
      maxHeight: 30,
    });
    expect(lineTexts(result)).toEqual(["あい", "う!!"]);
  });

  test("horizontal text never combines", () => {
    expect(layoutText({ text: "第12話", style }, fakeMeasurer).glyphs.length).toBe(4);
  });
});

describe("tsume in vertical text", () => {
  const tight = (options: LayoutOptions) =>
    layoutText(
      { writingMode: "vertical-rl", ...options, style: { ...style, tsume: 1, ...options.style } },
      inkMeasurer,
    );

  test("removes the space above and below upright glyphs", () => {
    const result = tight({ text: "あい" });
    expect(result.glyphs.map((glyph) => glyph.y)).toEqual([7, 15]);
    expect(result.glyphs[1]!.box).toEqual({ x: 0, y: 8, width: 10, height: 8 });
    expect(result.height).toBe(16);
  });

  test("measures shifted punctuation where it is drawn", () => {
    const result = tight({ text: "あ。" });
    expect(result.glyphs[1]!.advance).toBeCloseTo(4);
  });

  test("uses the sides of sideways glyphs", () => {
    const result = tight({ text: "（", style: { textOrientation: "sideways" } });
    expect(result.glyphs[0]!.advance).toBeCloseTo(8);
  });
});
