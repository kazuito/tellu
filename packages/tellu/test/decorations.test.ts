import { describe, expect, test } from "bun:test";
import { layoutText } from "../src/layout/layout";
import { parseMarkup } from "../src/markup";
import { traceLine } from "../src/render/decorationShapes";
import { planGroups } from "../src/render/groups";
import { defaultStyle } from "../src/style/defaults";
import { fill, frame, lineThrough, marker, overline, stroke, underline } from "../src/style/helpers";
import { applyOverride, mergeOverrides } from "../src/style/merge";
import type { BoxDecoration, LayoutOptions, LineDecoration } from "../src/style/types";
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
    expect(result.decorations.map(({ decoration, start }) => [(decoration as BoxDecoration).paint, start])).toEqual([
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

describe("line decorations", () => {
  // Em box from y 0 to 10; thickness 0.06em = 0.6px, offset 0.05em = 0.5px.
  const bands = (options: LayoutOptions) => layout(options).decorations.map(({ box }) => box);

  test("an underline sits below the em box, an overline above it", () => {
    expect(bands({ text: "あい", style: { decorations: [underline()] } })[0]).toEqual({
      x: 0,
      y: 10.5,
      width: 20,
      height: expect.closeTo(0.6, 9),
    });
    const [over] = bands({ text: "あい", style: { decorations: [overline({ thickness: 2, offset: 1 })] } });
    expect(over).toEqual({ x: 0, y: -3, width: 20, height: 2 });
  });

  test("a line-through crosses the middle of the em box", () => {
    expect(bands({ text: "あ", style: { decorations: [lineThrough({ thickness: 2 })] } })[0]).toEqual({
      x: 0,
      y: 4,
      width: 10,
      height: 2,
    });
    expect(bands({ text: "あ", style: { decorations: [lineThrough({ thickness: 2, offset: 1 })] } })[0]!.y).toBe(5);
  });

  test("double and wavy lines take a band three strokes thick", () => {
    expect(
      bands({ text: "あ", style: { decorations: [underline({ thickness: 2, style: "double" })] } })[0]!.height,
    ).toBe(6);
    expect(bands({ text: "あ", style: { decorations: [underline({ thickness: 2, style: "wavy" })] } })[0]!.height).toBe(
      6,
    );
    expect(
      bands({ text: "あ", style: { decorations: [underline({ thickness: 2, style: "dotted" })] } })[0]!.height,
    ).toBe(2);
  });

  test("em lengths use the largest font size of the stretch", () => {
    const result = layout({
      text: ["あ", { text: "い", style: { fontSize: 20 } }],
      style: { decorations: [underline({ thickness: { em: 0.1 } })] },
    });
    expect(result.decorations[0]!.box.height).toBe(2);
  });

  test("in vertical text an underline goes on the right by default, under on the left", () => {
    const vertical = (decoration: LineDecoration) =>
      bands({ text: "あい", writingMode: "vertical-rl", style: { decorations: [decoration] } })[0];
    // The column's em box runs from x 0 to 10.
    expect(vertical(underline({ thickness: 2, offset: 1 }))).toEqual({ x: 11, y: 0, width: 2, height: 20 });
    expect(vertical(underline({ thickness: 2, offset: 1, position: "under" }))).toEqual({
      x: -3,
      y: 0,
      width: 2,
      height: 20,
    });
  });

  test("a line restarts where the run's layers change, and takes each run's layers", () => {
    const result = layout({
      text: ["あい", { text: "うえ", style: { layers: [fill("red")] } }, "お"],
      style: { decorations: [underline()] },
    });
    expect(result.decorations.map(({ start, end, runIndex }) => [start, end, runIndex])).toEqual([
      [0, 2, 0],
      [2, 4, 1],
      [4, 5, 2],
    ]);
    // A box decoration spans the runs regardless.
    const boxed = layout({
      text: ["あい", { text: "うえ", style: { layers: [fill("red")] } }],
      style: { decorations: [highlight] },
    });
    expect(boxed.decorations).toHaveLength(1);
  });

  test("line decorations join the slot groups of their run's layers", () => {
    const result = layout({
      text: "あい",
      style: { layers: [stroke(4, "black"), fill("white")], decorations: [underline(), highlight] },
    });
    const groups = planGroups(result);
    expect(groups.map((group) => group.members.map((member) => ("glyph" in member ? member.glyph : "line")))).toEqual([
      [0, 1, "line"],
      [0, 1, "line"],
    ]);
  });
});

describe("traceLine", () => {
  /** Records the points a shape visits. */
  function trace(decoration: LineDecoration, width: number, height: number, thickness: number, vertical = false) {
    const points: [number, number][] = [];
    let subpaths = 0;
    traceLine(
      {
        moveTo: (x, y) => {
          subpaths++;
          points.push([x, y]);
        },
        lineTo: (x, y) => points.push([x, y]),
        arc: (x, y, r) => points.push([x - r, y - r], [x + r, y + r]),
        closePath: () => {},
      },
      decoration,
      width,
      height,
      thickness,
      vertical,
    );
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return { subpaths, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
  }

  test("every style stays inside its band", () => {
    for (const style of ["solid", "double", "dotted", "dashed", "wavy"] as const) {
      const height = style === "double" || style === "wavy" ? 6 : 2;
      const { bounds } = trace(underline({ style }), 100, height, 2);
      expect(bounds[0]).toBeGreaterThanOrEqual(0);
      expect(bounds[1]).toBeGreaterThanOrEqual(-1e-9);
      expect(bounds[2]).toBeLessThanOrEqual(100);
      expect(bounds[3]).toBeLessThanOrEqual(height + 1e-9);
    }
  });

  test("solid and double lines span the band", () => {
    expect(trace(underline(), 100, 2, 2)).toEqual({ subpaths: 1, bounds: [0, 0, 100, 2] });
    expect(trace(underline({ style: "double" }), 100, 6, 2)).toEqual({ subpaths: 2, bounds: [0, 0, 100, 6] });
  });

  test("dots and dashes fill the length exactly", () => {
    const dots = trace(underline({ style: "dotted" }), 100, 2, 2);
    // One dot every two thicknesses.
    expect(dots.subpaths).toBe(25);
    expect(dots.bounds).toEqual([0, 0, 100, 2]);
    const dashes = trace(underline({ style: "dashed" }), 100, 2, 2);
    expect(dashes.bounds).toEqual([0, 0, 100, 2]);
    expect(dashes.subpaths).toBe(10);
  });

  test("vertical lines run down the band", () => {
    expect(trace(underline({ style: "double" }), 6, 100, 2, true)).toEqual({ subpaths: 2, bounds: [0, 0, 6, 100] });
  });

  test("nothing for an empty band", () => {
    expect(trace(underline(), 0, 2, 2).subpaths).toBe(0);
    expect(trace(underline(), 100, 0, 0).subpaths).toBe(0);
  });
});
