import { describe, expect, test } from "bun:test";
import { fill, linearGradient, shadow, stroke } from "../src/style/helpers";
import { applyOverride, mergeOverrides } from "../src/style/merge";
import { defaultStyle } from "../src/style/defaults";

const base = { ...defaultStyle, layers: [stroke(8, "black", { id: "edge" }), fill("white")] };

describe("applyOverride", () => {
  test("patches layers by index and by id", () => {
    const style = applyOverride(base, { fontSize: 99, layers: { 1: { paint: "red" }, edge: { stroke: 12 } } });
    expect(style.fontSize).toBe(99);
    expect(style.layers).toEqual([
      { id: "edge", paint: "black", stroke: 12 },
      { paint: "red", stroke: 0 },
    ]);
  });

  test("an array replaces all layers", () => {
    expect(applyOverride(base, { layers: [fill("blue")] }).layers).toEqual([fill("blue")]);
  });

  test("ignores undefined fields", () => {
    expect(applyOverride(base, { fontSize: undefined }).fontSize).toBe(defaultStyle.fontSize);
  });
});

describe("mergeOverrides", () => {
  test("applies an inner patch onto outer replacement layers", () => {
    const merged = mergeOverrides({ layers: [fill("blue"), fill("green")] }, { layers: { 1: { paint: "pink" } } });
    expect(merged!.layers).toEqual([fill("blue"), fill("pink")]);
  });
});

describe("helpers", () => {
  test("spread plain colors evenly over a gradient", () => {
    expect(linearGradient(["red", "green", "blue"]).stops).toEqual([
      [0, "red"],
      [0.5, "green"],
      [1, "blue"],
    ]);
  });

  test("shadow defaults", () => {
    expect(shadow({ offset: [2, 3] })).toEqual({ blur: 4, paint: "rgba(0,0,0,0.6)", stroke: 0, offset: [2, 3] });
  });
});
