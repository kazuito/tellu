import { describe, expect, test } from "bun:test";
import { layoutText } from "../src/layout/layout";
import { wipeClip } from "../src/layout/wipe";
import { multiplyTints, tintOf, WHITE } from "../src/render/tint";
import { layerTransformFor } from "../src/style/merge";
import { fakeMeasurer } from "./fakeMeasurer";

// Two lines of 4 glyphs, 10px each: lines 0–40 long, 12px apart.
const layout = layoutText({ text: "ああああ\nいいいい", style: { fontSize: 10 } }, fakeMeasurer);

describe("wipeClip", () => {
  test("shows nothing at 0 and every line at 1", () => {
    expect(wipeClip(layout, 0)).toEqual([]);
    const all = wipeClip(layout, 1);
    expect(all).toHaveLength(2);
    expect(all[0]!.x).toBe(-20);
    expect(all[0]!.x + all[0]!.width).toBe(60);
  });

  test("shows earlier lines in full and the current one up to the wipe", () => {
    const boxes = wipeClip(layout, 0.75);
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.x + boxes[0]!.width).toBe(60);
    expect(boxes[1]!.x + boxes[1]!.width).toBe(20);
  });

  test("meets halfway between lines and reaches past the first and last", () => {
    const [first, second] = wipeClip(layout, 1);
    const [line0, line1] = layout.lines;
    const middle = (line0!.contentBox.y + line0!.contentBox.height + line1!.contentBox.y) / 2;
    expect(first!.y + first!.height).toBeCloseTo(middle);
    expect(second!.y).toBeCloseTo(middle);
    expect(first!.y).toBeCloseTo(line0!.contentBox.y - 20);
  });

  test("skips a line the wipe has only reached", () => {
    expect(wipeClip(layout, 0.5)).toHaveLength(1);
  });

  test("by glyph gives every glyph the same share", () => {
    const mixed = layoutText(
      { text: ["ああ", { text: "\nいいいい", style: { fontSize: 20 } }], style: { fontSize: 10 } },
      fakeMeasurer,
    );
    // 6 glyphs: at 1/3 the first line (2 glyphs) is done.
    expect(wipeClip(mixed, 1 / 3, { by: "glyph" })).toHaveLength(1);
    const [, current] = wipeClip(mixed, 0.5, { by: "glyph" });
    expect(current!.x + current!.width).toBeCloseTo(20);
  });

  test("runs down the columns of vertical text", () => {
    const vertical = layoutText(
      { text: "ああああ\nいいいい", writingMode: "vertical-rl", style: { fontSize: 10 } },
      fakeMeasurer,
    );
    const [first, second] = wipeClip(vertical, 0.75);
    expect(first!.y + first!.height).toBe(60);
    expect(second!.y + second!.height).toBe(20);
    // The second column is to the left of the first.
    expect(second!.x).toBeLessThan(first!.x);
  });
});

describe("layerTransformFor", () => {
  test("merges the index entry with the id entry, which wins", () => {
    const layers = { 1: { opacity: 0.5, tint: "red" }, glow: { opacity: 0 } };
    expect(layerTransformFor(layers, 1, "glow")).toEqual({ opacity: 0, tint: "red" });
    expect(layerTransformFor(layers, 1, undefined)).toEqual({ opacity: 0.5, tint: "red" });
    expect(layerTransformFor(layers, 0, undefined)).toBeUndefined();
    expect(layerTransformFor(undefined, 0, "glow")).toBeUndefined();
  });
});

describe("tints", () => {
  test("parse colors without their alpha", () => {
    expect(tintOf(undefined)).toBe(WHITE);
    expect(tintOf("#ff8000")).toBe(0xff8000);
    expect(tintOf("rgba(255, 0, 0, 0.5)")).toBe(0xff0000);
    expect(tintOf(0x12345678)).toBe(0x345678);
  });

  test("multiply channel by channel", () => {
    expect(multiplyTints(WHITE, 0x336699)).toBe(0x336699);
    expect(multiplyTints(0xff8000, 0x80ff80)).toBe(0x808000);
  });
});
