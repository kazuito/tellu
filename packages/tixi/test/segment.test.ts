import { describe, expect, test } from "bun:test";
import { BREAK_FALLBACK, BREAK_NONE, BREAK_PREFERRED, computeBreaks, segmentRuns } from "../src/layout/segment";
import { defaultKinsoku } from "../src/style/defaults";

const breaksOf = (text: string, lineBreak: "char" | "phrase" = "char") => {
  const clusters = segmentRuns([text], "ja");
  return [...computeBreaks(clusters, { lineBreak, locale: "ja", kinsoku: defaultKinsoku })];
};

describe("segmentRuns", () => {
  test("classifies clusters and tracks run offsets", () => {
    const clusters = segmentRuns(["a b", "\nc"], "ja");
    expect(clusters.map((c) => [c.text, c.kind, c.runIndex, c.start])).toEqual([
      ["a", "char", 0, 0],
      [" ", "space", 0, 1],
      ["b", "char", 0, 2],
      ["\n", "newline", 1, 0],
      ["c", "char", 1, 1],
    ]);
  });

  test("ideographic space is not a collapsible break space", () => {
    expect(segmentRuns(["あ　い"], "ja")[1]!.kind).toBe("char");
  });
});

describe("computeBreaks", () => {
  test("allows breaks between CJK characters but never before the first", () => {
    expect(breaksOf("あいう")).toEqual([BREAK_NONE, BREAK_PREFERRED, BREAK_PREFERRED]);
  });

  test("breaks latin only after spaces and hyphens", () => {
    expect(breaksOf("ab cd-ef")).toEqual([0, 0, 0, 2, 0, 0, 2, 0]);
  });

  test("applies kinsoku", () => {
    expect(breaksOf("あ。「い」")).toEqual([0, 0, 2, 0, 0]);
    expect(breaksOf("あ……")).toEqual([0, 2, 0]);
  });

  test("phrase mode prefers phrase boundaries and keeps char breaks as fallback", () => {
    const breaks = breaksOf("今日は晴れ", "phrase");
    // 今日は | 晴れ
    expect(breaks[3]).toBe(BREAK_PREFERRED);
    expect(breaks[1]).toBe(BREAK_FALLBACK);
    expect(breaks[2]).toBe(BREAK_FALLBACK);
  });
});
