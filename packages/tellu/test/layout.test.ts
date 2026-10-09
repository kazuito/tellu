import { describe, expect, test } from "bun:test";
import { type Layout, layoutText } from "../src/layout/layout";
import type { LayoutOptions } from "../src/style/types";
import { fakeMeasurer, inkMeasurer } from "./fakeMeasurer";

const style = { fontSize: 10, lineHeight: 1 };
const layout = (options: LayoutOptions) =>
  layoutText({ ...options, style: { ...style, ...options.style } }, fakeMeasurer);
const lineTexts = (result: Layout) =>
  result.lines.map((line) =>
    result.glyphs
      .slice(line.start, line.end)
      .map((glyph) => glyph.text)
      .join(""),
  );

describe("line breaking", () => {
  test("keeps a single line without maxWidth", () => {
    const result = layout({ text: "こんにちは世界" });
    expect(lineTexts(result)).toEqual(["こんにちは世界"]);
    expect(result.width).toBe(70);
    expect(result.height).toBe(10);
  });

  test("honors explicit newlines including blank lines", () => {
    expect(lineTexts(layout({ text: "あ\n\nい" }))).toEqual(["あ", "", "い"]);
    expect(lineTexts(layout({ text: "あ\r\nい" }))).toEqual(["あ", "い"]);
  });

  test("wraps CJK at any character", () => {
    expect(lineTexts(layout({ text: "あいうえおかきくけこ", maxWidth: 40 }))).toEqual(["あいうえ", "おかきく", "けこ"]);
  });

  test("wraps latin at spaces and drops the space at the break", () => {
    const result = layout({ text: "hello big world", maxWidth: 40 });
    expect(lineTexts(result)).toEqual(["hello ", "big ", "world"]);
    expect(result.lines[0]!.inlineSize).toBe(25);
  });

  test("breaks long words as a last resort", () => {
    expect(lineTexts(layout({ text: "abcdefghij", maxWidth: 30 }))).toEqual(["abcdef", "ghij"]);
  });

  test("does not start a line with closing punctuation (行頭禁則)", () => {
    expect(lineTexts(layout({ text: "あいう」えお", maxWidth: 30 }))).toEqual(["あい", "う」え", "お"]);
  });

  test("does not end a line with an opening bracket (行末禁則)", () => {
    expect(lineTexts(layout({ text: "あい「うえ", maxWidth: 30 }))).toEqual(["あい", "「うえ"]);
  });

  test("hangs 、 and 。 past the edge (ぶら下げ)", () => {
    expect(lineTexts(layout({ text: "あいう。えお", maxWidth: 30 }))).toEqual(["あいう。", "えお"]);
  });

  test("hanging punctuation before a newline or the end adds no blank line", () => {
    expect(lineTexts(layout({ text: "あいう。\nえ", maxWidth: 30 }))).toEqual(["あいう。", "え"]);
    expect(lineTexts(layout({ text: "あいう。", maxWidth: 30 }))).toEqual(["あいう。"]);
  });

  test("kinsoku can be disabled", () => {
    expect(lineTexts(layout({ text: "あいう」えお", maxWidth: 30, kinsoku: false }))).toEqual(["あいう", "」えお"]);
  });

  test("letter spacing counts toward wrapping but not after the last glyph", () => {
    const result = layout({ text: "あいう", style: { letterSpacing: 5 } });
    expect(result.lines[0]!.inlineSize).toBe(40);
    expect(result.glyphs.map((glyph) => glyph.x)).toEqual([0, 15, 30]);
    expect(lineTexts(layout({ text: "あいう", maxWidth: 34, style: { letterSpacing: 5 } }))).toEqual(["あい", "う"]);
  });

  test("scaleX narrows glyphs (長体)", () => {
    const result = layout({ text: "あいう", style: { scaleX: 0.5 } });
    expect(result.width).toBe(15);
    expect(result.glyphs[1]!.x).toBe(5);
    expect(result.glyphs[1]!.scaleX).toBe(0.5);
  });

  test("em letter spacing scales with the font size", () => {
    const result = layout({ text: "あい", style: { letterSpacing: { em: 0.5 } } });
    expect(result.glyphs[1]!.x).toBe(15);
  });
});

describe("tsume", () => {
  const tight = (options: LayoutOptions) =>
    layoutText({ ...options, style: { ...style, ...options.style } }, inkMeasurer);

  test("removes a fraction of the blank space on both sides of each character", () => {
    const result = tight({ text: "あいう", style: { tsume: 0.5 } });
    expect(result.glyphs.map((glyph) => glyph.x)).toEqual([-0.5, 8.5, 17.5]);
    expect(result.glyphs.map((glyph) => glyph.advance)).toEqual([9, 9, 9]);
    expect(result.glyphs[1]!.box.x).toBe(9);
    expect(result.lines[0]!.inlineSize).toBe(27);
  });

  test("follows the ink of each glyph", () => {
    const result = tight({ text: "あ。", style: { tsume: 1 } });
    expect(result.glyphs[1]!.advance).toBeCloseTo(3);
    expect(result.lines[0]!.inlineSize).toBeCloseTo(11);
  });

  test("leaves latin, spaces and runs without tsume alone", () => {
    const result = tight({ text: ["a あ", { text: "い", style: { tsume: 0 } }], style: { tsume: 1 } });
    expect(result.glyphs.map((glyph) => glyph.advance)).toEqual([5, 2.5, 8, 10]);
  });

  test("counts toward wrapping", () => {
    expect(lineTexts(tight({ text: "あいうえ", maxWidth: 32, style: { tsume: 1 } }))).toEqual(["あいうえ"]);
    expect(lineTexts(layout({ text: "あいうえ", maxWidth: 32 }))).toEqual(["あいう", "え"]);
  });

  test("needs a measurer with ink bounds", () => {
    expect(layout({ text: "あい", style: { tsume: 1 } }).lines[0]!.inlineSize).toBe(20);
  });
});

describe("punctuation trim", () => {
  test("start trims the blank half before an opening bracket at the start of each line", () => {
    const result = layout({ text: "「あ」\nあいう「えお", maxWidth: 30, punctuationTrim: "start" });
    expect(lineTexts(result)).toEqual(["「あ」", "あいう", "「えお"]);
    expect(result.glyphs[0]!.x).toBe(-5);
    expect(result.glyphs[0]!.advance).toBe(5);
    expect(result.glyphs[1]!.x).toBe(5);
    expect(result.lines[0]!.inlineSize).toBe(25);
    expect(result.glyphs[6]!.x).toBe(-5);
  });

  test("end trims the blank half after closing punctuation at the end of each line", () => {
    const result = layout({ text: "あ」\nい。", maxWidth: 30, align: "end", punctuationTrim: "end" });
    expect(result.lines.map((line) => line.inlineSize)).toEqual([15, 15]);
    expect(result.lines[0]!.inlineStart).toBe(15);
    expect(result.glyphs[1]!.advance).toBe(5);
  });

  test("leaves punctuation inside a line alone", () => {
    const result = layout({ text: "「あ」い", punctuationTrim: "end" });
    expect(result.lines[0]!.inlineSize).toBe(40);
  });

  test("end keeps closing punctuation on a line it fits trimmed", () => {
    expect(lineTexts(layout({ text: "あい」う", maxWidth: 25 }))).toEqual(["あ", "い」", "う"]);
    const result = layout({ text: "あい」う", maxWidth: 25, punctuationTrim: "end" });
    expect(lineTexts(result)).toEqual(["あい」", "う"]);
    expect(result.lines[0]!.inlineSize).toBe(25);
  });

  test("does not break before a character that must not start a line", () => {
    const result = layout({ text: "あい」。え", maxWidth: 25, punctuationTrim: "end" });
    expect(lineTexts(result)).toEqual(["あ", "い」。", "え"]);
    expect(lineTexts(layout({ text: "あい」\nえ", maxWidth: 25, punctuationTrim: "end" }))).toEqual(["あい」", "え"]);
  });

  test("does not trim space that tsume already removed", () => {
    const result = layoutText({ text: "「あ", style: { ...style, tsume: 1 }, punctuationTrim: "start" }, inkMeasurer);
    expect(result.glyphs[0]!.x).toBe(-5);
    expect(result.glyphs[0]!.advance).toBe(4);
  });
});

describe("autospace", () => {
  test("adds a quarter em between kana or kanji and latin letters or digits", () => {
    const result = layout({ text: "あAい1", autospace: true });
    expect(result.glyphs.map((glyph) => glyph.x)).toEqual([0, 12.5, 20, 32.5]);
  });

  test("takes px or em lengths", () => {
    expect(layout({ text: "あA", autospace: 4 }).glyphs[1]!.x).toBe(14);
    expect(layout({ text: "あA", autospace: { em: 0.5 } }).glyphs[1]!.x).toBe(15);
  });

  test("uses the smaller font", () => {
    expect(layout({ text: ["あ", { text: "A", style: { fontSize: 20 } }], autospace: true }).glyphs[1]!.x).toBe(12.5);
  });

  test("skips spaces, punctuation and fullwidth letters", () => {
    expect(layout({ text: "あ A", autospace: true }).glyphs[2]!.x).toBe(12.5);
    expect(layout({ text: "、A", autospace: true }).glyphs[1]!.x).toBe(10);
    expect(layout({ text: "あＡ", autospace: true }).glyphs[1]!.x).toBe(10);
  });

  test("is dropped at the start of a line", () => {
    const result = layout({ text: "あいAB", maxWidth: 20, autospace: true });
    expect(lineTexts(result)).toEqual(["あい", "AB"]);
    expect(result.glyphs[2]!.x).toBe(0);
  });
});

describe("kerning", () => {
  const kerningMeasurer = {
    ...fakeMeasurer,
    measureText(text: string, font: Parameters<typeof fakeMeasurer.measureText>[1]) {
      return fakeMeasurer.measureText(text, font) - (text.match(/。「/g)?.length ?? 0) * 4;
    },
  };

  test("shifts the following glyph instead of shrinking its advance", () => {
    const result = layoutText({ text: "あ。「い", style }, kerningMeasurer);
    expect(result.glyphs.map((glyph) => glyph.x)).toEqual([0, 10, 16, 26]);
    expect(result.glyphs[2]!.advance).toBe(10);
    expect(result.lines[0]!.inlineSize).toBe(36);
  });

  test("drops kerning across a line break", () => {
    const result = layoutText({ text: "あ。「い", style, maxWidth: 20 }, kerningMeasurer);
    expect(lineTexts(result)).toEqual(["あ。", "「い"]);
    expect(result.glyphs[2]!.x).toBe(0);
    expect(result.lines[1]!.inlineSize).toBe(20);
  });

  test("measures long runs in bounded windows without losing kerning", () => {
    const measured: string[] = [];
    const counting = {
      ...kerningMeasurer,
      measureText(text: string, font: Parameters<typeof fakeMeasurer.measureText>[1]) {
        measured.push(text);
        return kerningMeasurer.measureText(text, font);
      },
    };
    const text = `${"あ".repeat(63)}。「${"あ".repeat(935)}`;
    const result = layoutText({ text, style }, counting);
    expect(Math.max(...measured.map((part) => part.length))).toBeLessThanOrEqual(64);
    expect(measured.reduce((sum, part) => sum + part.length, 0)).toBeLessThan(text.length * 64);
    expect(result.glyphs[64]!.x - result.glyphs[63]!.x).toBe(6);
    expect(result.lines[0]!.inlineSize).toBe(text.length * 10 - 4);
  });
});

describe("alignment", () => {
  test("center and right align within maxWidth", () => {
    expect(layout({ text: "あい", maxWidth: 100, align: "center" }).lines[0]!.inlineStart).toBe(40);
    expect(layout({ text: "あい", maxWidth: 100, align: "right" }).lines[0]!.inlineStart).toBe(80);
  });

  test("centers lines against the widest line without maxWidth", () => {
    const result = layout({ text: "あいうえ\nあい", align: "center" });
    expect(result.width).toBe(40);
    expect(result.lines[1]!.inlineStart).toBe(10);
  });

  test("justify spreads CJK lines but not the last line", () => {
    const result = layout({ text: "あいうえおかき", maxWidth: 55, align: "justify" });
    expect(lineTexts(result)).toEqual(["あいうえお", "かき"]);
    expect(result.lines[0]!.inlineSize).toBeCloseTo(55);
    expect(result.glyphs[4]!.x).toBeCloseTo(45);
    expect(result.glyphs[6]!.x).toBe(10);
  });

  test("justify spreads latin lines at spaces", () => {
    const result = layout({ text: "ab cd efgh", maxWidth: 30, align: "justify" });
    expect(lineTexts(result)).toEqual(["ab cd ", "efgh"]);
    const [a, b, , c] = result.glyphs;
    expect(b!.x - a!.x).toBe(5);
    expect(c!.x).toBeCloseTo(20);
  });
});

describe("wrap: balance", () => {
  test("evens out the lines of a paragraph", () => {
    expect(lineTexts(layout({ text: "あいうえおかきくけこさし", maxWidth: 100 }))).toEqual([
      "あいうえおかきくけこ",
      "さし",
    ]);
    expect(lineTexts(layout({ text: "あいうえおかきくけこさし", maxWidth: 100, wrap: "balance" }))).toEqual([
      "あいうえおか",
      "きくけこさし",
    ]);
    expect(lineTexts(layout({ text: "aaa bbb ccc ddd", maxWidth: 50, wrap: "balance" }))).toEqual([
      "aaa bbb ",
      "ccc ddd",
    ]);
  });

  test("balances each paragraph and keeps its forced break", () => {
    const result = layout({ text: "あいうえおかきくけこさし\nあ", maxWidth: 100, wrap: "balance", align: "justify" });
    expect(lineTexts(result)).toEqual(["あいうえおか", "きくけこさし", "あ"]);
    expect(result.lines.map((line) => line.inlineSize)).toEqual([100, 60, 10]);
  });

  test("aligns against the full line length", () => {
    const result = layout({ text: "あいうえおかきくけこさし", maxWidth: 100, wrap: "balance", align: "center" });
    expect(result.width).toBe(100);
    expect(result.lines[0]!.inlineStart).toBe(20);
  });

  test("acts like auto without a line length", () => {
    expect(lineTexts(layout({ text: "あいう\nえ", wrap: "balance" }))).toEqual(["あいう", "え"]);
  });
});

describe("wrap: pretty", () => {
  test("gives a lone character and its punctuation company (泣き別れ)", () => {
    expect(lineTexts(layout({ text: "あいうえおかきくけこさ。", maxWidth: 100, wrap: "pretty" }))).toEqual([
      "あいうえおかきくけ",
      "こさ。",
    ]);
  });

  test("gives a lone word company", () => {
    expect(lineTexts(layout({ text: "aaa bbb ccc ddd", maxWidth: 50, wrap: "pretty" }))).toEqual([
      "aaa bbb ",
      "ccc ddd",
    ]);
  });

  test("gives a lone phrase company", () => {
    const text = "今日は晴れているので公園へ散歩に行きます";
    expect(lineTexts(layout({ text, maxWidth: 160, lineBreak: "phrase" }))).toEqual([
      "今日は晴れているので公園へ散歩に",
      "行きます",
    ]);
    expect(lineTexts(layout({ text, maxWidth: 160, lineBreak: "phrase", wrap: "pretty" }))).toEqual([
      "今日は晴れているので公園へ",
      "散歩に行きます",
    ]);
  });

  test("keeps the lines when the last one already has two units or nothing fits", () => {
    expect(lineTexts(layout({ text: "あいうえおかきくけこさし", maxWidth: 100, wrap: "pretty" }))).toEqual([
      "あいうえおかきくけこ",
      "さし",
    ]);
    expect(lineTexts(layout({ text: "a b cccccccccc", maxWidth: 50, wrap: "pretty" }))).toEqual(["a b ", "cccccccccc"]);
  });

  test("works per paragraph", () => {
    expect(lineTexts(layout({ text: "あいうえおかきくけこさ。\nあ", maxWidth: 100, wrap: "pretty" }))).toEqual([
      "あいうえおかきくけ",
      "こさ。",
      "あ",
    ]);
  });
});

describe("justify-all", () => {
  test("spreads a single line to the line length (字取り)", () => {
    const result = layout({ text: "あいう", maxWidth: 50, align: "justify-all" });
    expect(result.glyphs.map((glyph) => glyph.x)).toEqual([0, 20, 40]);
    expect(result.lines[0]!.inlineSize).toBe(50);
  });

  test("spreads the last line and lines ended by a newline", () => {
    const result = layout({ text: "あい\nあいう", maxWidth: 40, align: "justify-all" });
    expect(result.glyphs.map((glyph) => glyph.x)).toEqual([0, 30, 0, 15, 30]);
  });

  test("spreads to the longest line without a line length", () => {
    const result = layout({ text: "あい\nあいう", align: "justify-all" });
    expect(result.width).toBe(30);
    expect(result.glyphs[1]!.x).toBe(20);
  });

  test("widens the gaps at spaces when there are any", () => {
    const result = layout({ text: "ab cd", maxWidth: 40, align: "justify-all" });
    expect(result.glyphs.map((glyph) => glyph.x)).toEqual([0, 5, 27.5, 30, 35]);
  });

  test("leaves a single character at the start", () => {
    expect(layout({ text: "あ", maxWidth: 40, align: "justify-all" }).glyphs[0]!.x).toBe(0);
  });
});

describe("vertical metrics", () => {
  test("mixed font sizes share a baseline", () => {
    const result = layout({ text: ["あ", { text: "い", style: { fontSize: 20 } }] });
    const [small, big] = result.glyphs;
    expect(small!.y).toBe(big!.y);
    expect(result.lines[0]!.blockSize).toBe(20);
    expect(result.lines[0]!.baseline).toBe(16);
  });

  test("line height adds half-leading above and below", () => {
    const result = layout({ text: "あ\nい", style: { lineHeight: 2 } });
    expect(result.lines.map((line) => line.baseline)).toEqual([13, 33]);
    expect(result.height).toBe(40);
  });

  test("absolute line height", () => {
    expect(layout({ text: "あ\nい", style: { lineHeight: { px: 30 } } }).height).toBe(60);
  });

  test("baseline shift raises a run", () => {
    const result = layout({ text: ["あ", { text: "い", style: { baselineShift: 4 } }] });
    expect(result.glyphs[0]!.y - result.glyphs[1]!.y).toBe(4);
  });
});

describe("overflow", () => {
  test("shrink scales the font until it fits", () => {
    const result = layout({ text: "あいうえお", maxWidth: 25, wrap: "none", overflow: "shrink" });
    expect(result.fontScale).toBeCloseTo(0.5, 2);
    expect(result.lines[0]!.inlineSize).toBeLessThanOrEqual(25.01);
    expect(result.glyphs[0]!.fontSize).toBeCloseTo(5, 1);
  });

  test("shrink respects maxLines while wrapping", () => {
    const result = layout({ text: "あいうえおかきくけこ", maxWidth: 40, maxLines: 2, overflow: "shrink" });
    expect(result.lines.length).toBe(2);
    expect(result.fontScale).toBeLessThan(1);
  });

  test("shrink cuts to maxLines when even minScale does not fit", () => {
    const result = layout({ text: "あ".repeat(40), maxWidth: 20, maxLines: 2, overflow: "shrink", minScale: 0.5 });
    expect(result.fontScale).toBe(0.5);
    expect(lineTexts(result)).toEqual(["ああああ", "ああああ"]);
  });

  test("shrink without a box still applies maxLines", () => {
    expect(lineTexts(layout({ text: "あ\nい\nう", maxLines: 2, overflow: "shrink" }))).toEqual(["あ", "い"]);
  });

  test("squeeze compresses overflowing lines horizontally", () => {
    const result = layout({ text: "あいうえ\nあ", maxWidth: 20, wrap: "none", overflow: "squeeze" });
    expect(result.lines[0]!.inlineSize).toBe(20);
    expect(result.glyphs[0]!.scaleX).toBe(0.5);
    expect(result.glyphs[1]!.x).toBe(5);
    expect(result.glyphs[4]!.scaleX).toBe(1);
  });

  test("maxLines truncates when not shrinking", () => {
    expect(lineTexts(layout({ text: "あいうえおかき", maxWidth: 20, maxLines: 2 }))).toEqual(["あい", "うえ"]);
  });
});

describe("glyphs", () => {
  test("indexes glyphs across runs and lines", () => {
    const result = layout({ text: ["あい", { text: "う\nえ", tags: ["em"] }] });
    expect(result.glyphs.map((glyph) => [glyph.text, glyph.runIndex, glyph.lineIndex, glyph.indexInLine])).toEqual([
      ["あ", 0, 0, 0],
      ["い", 0, 0, 1],
      ["う", 1, 0, 2],
      ["え", 1, 1, 0],
    ]);
    expect(result.runs[1]!.tags).toEqual(["em"]);
  });

  test("keeps emoji and combining sequences as one glyph", () => {
    const result = layout({ text: "👨‍👩‍👧が" });
    expect(result.glyphs.map((glyph) => glyph.text)).toEqual(["👨‍👩‍👧", "が"]);
  });

  test("empty text still has one line", () => {
    const result = layout({ text: "" });
    expect(result.lines.length).toBe(1);
    expect(result.height).toBe(10);
  });
});
