import { describe, expect, test } from "bun:test";
import { type Layout, layoutText } from "../src/layout/layout";
import { arcPath, marker } from "../src/style/helpers";
import type { LayoutOptions } from "../src/style/types";
import { fakeMeasurer } from "./fakeMeasurer";

// fakeMeasurer at 10px: CJK 10px wide; the em box runs 8px above the baseline and 2px below.
const style = { fontSize: 10, lineHeight: 1 };
const layout = (options: LayoutOptions) =>
  layoutText({ ...options, style: { ...style, ...options.style } }, fakeMeasurer);
const centers = (result: Layout) =>
  result.glyphs.map(({ box }) => [box.x + box.width / 2, box.y + box.height / 2] as const);
const round = (value: number) => Math.round(value * 1e6) / 1e6;

describe("textPath", () => {
  test("a straight path leaves the text as it was, moved to the origin", () => {
    const straight = layout({ text: "あいう" });
    const onPath = layout({ text: "あいう", textPath: { d: "M100 300 H400" }, maxWidth: 300 });
    expect(onPath.glyphs.map((glyph) => glyph.angle)).toEqual([0, 0, 0]);
    expect(centers(onPath).map(([x, y]) => [round(x), round(y)])).toEqual(centers(straight).map(([x, y]) => [x, y]));
    expect([onPath.width, onPath.height]).toEqual([30, 10]);
  });

  test("the path's length is the line length", () => {
    const result = layout({ text: "あいうえお", textPath: { d: "M0 0 H30" } });
    expect(result.lines).toHaveLength(2);
    const shrunk = layout({ text: "あいうえお", textPath: { d: "M0 0 H30" }, overflow: "shrink", maxLines: 1 });
    expect(shrunk.lines).toHaveLength(1);
    expect(shrunk.fontScale).toBeCloseTo(0.6, 2);
  });

  test("glyphs turn with the path", () => {
    const result = layout({ text: "あい", textPath: { d: "M0 0 V100" } });
    expect(result.glyphs.map((glyph) => glyph.angle)).toEqual([90, 90]);
    const [first, second] = centers(result);
    expect(first![0]).toBeCloseTo(second![0]);
    expect(second![1] - first![1]).toBeCloseTo(10);
  });

  test("an arc: glyphs stand on the circle, centered at the top", () => {
    const radius = 100;
    const result = layout({ text: "あいうえお", textPath: arcPath(radius), align: "center" });
    const angles = result.glyphs.map((glyph) => glyph.angle);
    expect(angles[2]).toBeCloseTo(0);
    expect(angles[0]).toBeCloseTo(-angles[4]!);
    expect(angles[0]).toBeLessThan(angles[1]!);
    // Each cell's bottom center (its baseline is 2px above the cell bottom) lies 2px outside... measured on the
    // baseline: the baseline midpoint of every glyph is on the circle.
    const baselinePoints = result.glyphs.map(({ box, angle }) => {
      const a = (angle * Math.PI) / 180;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      // From the cell center down to the baseline (3px: the cell runs 8px up and 2px down from it).
      return [cx - 3 * Math.sin(a), cy + 3 * Math.cos(a)] as const;
    });
    const [mx, my] = baselinePoints[2]!;
    const circleCenter = [mx, my + radius];
    for (const [x, y] of baselinePoints) {
      expect(Math.hypot(x - circleCenter[0]!, y - circleCenter[1]!)).toBeCloseTo(radius, 6);
    }
  });

  test("a counterclockwise arc along the bottom reads left to right", () => {
    const result = layout({
      text: "あいう",
      textPath: arcPath(100, { center: 180, direction: "counterclockwise" }),
      align: "center",
    });
    const [first, , last] = centers(result);
    expect(first![0]).toBeLessThan(last![0]);
    expect(result.glyphs[1]!.angle).toBeCloseTo(0);
    // The ends curve up toward the circle's center.
    expect(first![1]).toBeLessThan(centers(result)[1]![1]);
  });

  test("later lines follow the path at their distance", () => {
    const result = layout({ text: "あ\nい", textPath: { d: "M0 0 V100" } });
    const [first, second] = centers(result);
    // Turned 90° clockwise, "down" points to -x.
    expect(first![0] - second![0]).toBeCloseTo(10);
    expect(first![1]).toBeCloseTo(second![1]);
  });

  test("startOffset and side", () => {
    const offset = layout({ text: "あ", textPath: { d: "M0 0 H100 V100", startOffset: 100 } });
    expect(offset.glyphs[0]!.angle).toBe(90);
    const right = layout({ text: "あい", textPath: { d: "M0 0 H100", side: "right" } });
    expect(right.glyphs.map((glyph) => glyph.angle)).toEqual([180, 180]);
    // Walked backward: the first glyph is at the right end.
    const [first, second] = centers(right);
    expect(first![0]).toBeGreaterThan(second![0]);
  });

  test("the layout box is the bounds of the turned cells", () => {
    const result = layout({ text: "あいう", textPath: arcPath(50) });
    const xs = result.glyphs.map(({ box }) => box.x + box.width / 2);
    expect(Math.min(...result.lines.map((line) => line.contentBox.x))).toBeCloseTo(0);
    expect(Math.min(...result.lines.map((line) => line.contentBox.y))).toBeCloseTo(0);
    expect(result.width).toBeGreaterThan(Math.max(...xs) - Math.min(...xs));
  });

  test("vertical text can't follow a path", () => {
    expect(() => layout({ text: "あ", writingMode: "vertical-rl", textPath: { d: "M0 0 H10" } })).toThrow();
  });

  test("a path needs d or arc", () => {
    expect(() => layout({ text: "あ", textPath: {} })).toThrow();
  });

  test("decorations aren't placed along paths", () => {
    expect(
      layout({ text: "あ", textPath: { d: "M0 0 H10" }, style: { decorations: [marker("red")] } }).decorations,
    ).toEqual([]);
  });

  test("arcPath()", () => {
    expect(arcPath(100)).toEqual({ arc: { radius: 100 } });
    expect(arcPath(100, { sweep: 90, side: "right", startOffset: 5 })).toEqual({
      arc: { radius: 100, sweep: 90 },
      side: "right",
      startOffset: 5,
    });
  });
});
