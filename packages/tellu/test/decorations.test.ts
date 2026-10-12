import { describe, expect, test } from "bun:test";
import { layoutText } from "../src/layout/layout";
import { parseMarkup } from "../src/markup";
import { defaultStyle } from "../src/style/defaults";
import { frame, marker } from "../src/style/helpers";
import { applyOverride, mergeOverrides } from "../src/style/merge";
import type { BoxDecoration, LayoutOptions } from "../src/style/types";
import { fakeMeasurer } from "./fakeMeasurer";

// fakeMeasurer at 10px: CJK 10px wide, ASCII 5px, space 2.5px. The em box of a line runs from y 0 to 10 (baseline 8).
const style = { fontSize: 10, lineHeight: 1 };
const layout = (options: LayoutOptions) =>
  layoutText({ ...options, style: { ...style, ...options.style } }, fakeMeasurer);
const highlight: BoxDecoration = { type: "box", paint: "yellow" };
const boxes = (options: LayoutOptions) =>
  layout(options).decorations.map(({ lineIndex, start, end, box }) => ({ lineIndex, start, end, box }));

describe("decoration layout", () => {
  test("text without decorations has none", () => {
    expect(layout({ text: "あいう" }).decorations).toEqual([]);
  });

  test("a box covers its run's em box", () => {
    expect(boxes({ text: ["あ", { text: "いう", style: { decorations: [highlight] } }, "え"] })).toEqual([
      { lineIndex: 0, start: 1, end: 3, box: { x: 10, y: 0, width: 20, height: 10 } },
    ]);
  });

  test("inset and padding", () => {
    const decoration: BoxDecoration = { ...highlight, inset: [0.5, 1], padding: [2, 1] };
    expect(boxes({ text: [{ text: "あい", style: { decorations: [decoration] } }] })[0]!.box).toEqual({
      x: -2,
      y: 4,
      width: 24,
      height: 7,
    });
  });

  test("the base style decorates the whole text", () => {
    const result = layout({ text: "あいう", style: { decorations: [highlight] } });
    expect(result.decorations).toHaveLength(1);
    expect(result.decorations[0]!.box.width).toBe(30);
    expect(result.decorations[0]!.decoration).toBe(highlight);
  });

  test("equal decorations of neighbouring runs make one stretch", () => {
    const text = parseMarkup("あ<m>い<b>う</b>え</m>お", {
      m: { decorations: [highlight] },
      b: { fontWeight: 900, decorations: [{ ...highlight }] },
    });
    expect(boxes({ text })).toEqual([{ lineIndex: 0, start: 1, end: 4, box: { x: 10, y: 0, width: 30, height: 10 } }]);
  });

  test("one stretch per line", () => {
    const result = boxes({ text: [{ text: "あいうえおか", style: { decorations: [highlight] } }], maxWidth: 40 });
    expect(result.map(({ lineIndex, box }) => [lineIndex, box.x, box.width])).toEqual([
      [0, 0, 40],
      [1, 0, 20],
    ]);
  });

  test("whitespace at line edges is left out, whitespace inside is kept", () => {
    expect(
      boxes({ text: "ab cd", style: { decorations: [highlight] }, maxWidth: 12 }).map(({ box }) => box.width),
    ).toEqual([10, 10]);
    expect(boxes({ text: "a b", style: { decorations: [highlight] } })[0]!.box.width).toBe(12.5);
    expect(boxes({ text: "  ab", style: { decorations: [highlight] } })[0]).toMatchObject({ start: 2, box: { x: 5 } });
  });

  test("a run with only whitespace inside a line is decorated", () => {
    expect(boxes({ text: ["a", { text: " ", style: { decorations: [highlight] } }, "b"] })).toEqual([
      { lineIndex: 0, start: 1, end: 2, box: { x: 5, y: 0, width: 2.5, height: 10 } },
    ]);
  });

  test("decorations come in the order they first appear", () => {
    const other: BoxDecoration = { type: "box", paint: "red" };
    const result = layout({
      text: [
        { text: "あ", style: { decorations: [other] } },
        { text: "い", style: { decorations: [highlight] } },
        { text: "う", style: { decorations: [other] } },
      ],
    });
    expect(result.decorations.map(({ decoration, start }) => [decoration.paint, start])).toEqual([
      ["red", 0],
      ["red", 2],
      ["yellow", 1],
    ]);
  });

  test("letter spacing and justification between glyphs are covered", () => {
    expect(boxes({ text: "あい", style: { letterSpacing: 4, decorations: [highlight] } })[0]!.box.width).toBe(24);
    const justified = boxes({
      text: "あいう",
      align: "justify-all",
      maxWidth: 50,
      style: { decorations: [highlight] },
    });
    expect(justified[0]!.box.width).toBe(50);
  });

  test("the largest font size of the stretch sets the em box", () => {
    const result = layout({
      text: ["あ", { text: "い", style: { fontSize: 20 } }],
      style: { decorations: [highlight] },
    });
    const { box, fontSize } = result.decorations[0]!;
    expect(fontSize).toBe(20);
    // The 20px glyph's em box: from 16px above the shared baseline to 4px below it.
    const baseline = result.lines[0]!.baseline;
    expect([box.y, box.y + box.height]).toEqual([baseline - 16, baseline + 4]);
  });

  test("shrink scales the boxes", () => {
    const result = layout({ text: "あいうえ", maxWidth: 20, overflow: "shrink", style: { decorations: [highlight] } });
    expect(result.decorations[0]!.fontSize).toBe(result.glyphs[0]!.fontSize);
    expect(result.decorations[0]!.box.width).toBeCloseTo(20);
  });

  test("vertical text: along the column, inset from the right", () => {
    const decoration: BoxDecoration = { ...highlight, inset: [0, 0.5], padding: [1, 0] };
    const result = layout({ text: "あいう", writingMode: "vertical-rl", style: { decorations: [decoration] } });
    expect(result.decorations[0]!.box).toEqual({ x: 5, y: -1, width: 5, height: 32 });
  });

  test("marker() and frame() defaults", () => {
    expect(marker("yellow")).toEqual({ type: "box", paint: "yellow", inset: [0.5, 1], padding: [2, 0] });
    expect(frame("red", { width: 2, radius: 4 })).toEqual({
      type: "box",
      stroke: { width: 2, paint: "red" },
      padding: [4, 2],
      radius: 4,
    });
  });
});

describe("merging decorations", () => {
  const underlay = marker("yellow");
  const box = frame("red");

  test("a run's decorations add to the base style's", () => {
    const base = { ...defaultStyle, decorations: [underlay] };
    expect(applyOverride(base, { decorations: [box] }).decorations).toEqual([underlay, box]);
    expect(applyOverride(base, { fontSize: 20 }).decorations).toEqual([underlay]);
  });

  test("equal decorations aren't added twice", () => {
    const base = { ...defaultStyle, decorations: [underlay] };
    expect(applyOverride(base, { decorations: [marker("yellow")] }).decorations).toEqual([underlay]);
  });

  test("nested overrides add up, outer first", () => {
    expect(mergeOverrides({ decorations: [underlay] }, { decorations: [box] })?.decorations).toEqual([underlay, box]);
    expect(mergeOverrides({ decorations: [underlay] }, { fontSize: 3 })?.decorations).toEqual([underlay]);
    expect(mergeOverrides({ fontSize: 3 }, { decorations: [box] })?.decorations).toEqual([box]);
  });
});
