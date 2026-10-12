import { describe, expect, test } from "bun:test";
import { diamondOffset, paintScope, reflectStops } from "../src/render/paint";
import { shapeOffsets } from "../src/render/sdf";
import { conicGradient, diamondGradient, linearGradient, shapeGradient } from "../src/style/helpers";

describe("reflectStops", () => {
  test("mirrors the stops around the middle", () => {
    expect(
      reflectStops([
        [0, "red"],
        [1, "blue"],
      ]),
    ).toEqual([
      { offset: 0, color: "blue" },
      { offset: 0.5, color: "red" },
      { offset: 0.5, color: "red" },
      { offset: 1, color: "blue" },
    ]);
  });

  test("keeps hard stops hard and in order", () => {
    const stops = reflectStops([
      [0, "white"],
      [0.5, "white"],
      [0.5, "yellow"],
      [1, "orange"],
    ]);
    expect(stops.map((stop) => [stop.offset, stop.color])).toEqual([
      [0, "orange"],
      [0.25, "yellow"],
      [0.25, "white"],
      [0.5, "white"],
      [0.5, "white"],
      [0.75, "white"],
      [0.75, "yellow"],
      [1, "orange"],
    ]);
  });

  test("clamps offsets", () => {
    expect(
      reflectStops([
        { offset: -1, color: "a" },
        { offset: 2, color: "b" },
      ]).map((stop) => stop.offset),
    ).toEqual([0, 0.5, 0.5, 1]);
  });
});

describe("diamondOffset", () => {
  const box = { x: 0, y: 0, width: 200, height: 100 };

  test("is 0 at the center and 1 at the farthest corner", () => {
    const at = diamondOffset(diamondGradient(["a", "b"]), box);
    expect(at(100, 50)).toBe(0);
    expect(at(0, 0)).toBeCloseTo(1);
    expect(at(200, 100)).toBeCloseTo(1);
    // Diamond, not ellipse: equal L1 distance gives equal offsets.
    expect(at(150, 50)).toBeCloseTo(at(100, 100));
  });

  test("center, radius and angle", () => {
    const corner = diamondOffset(diamondGradient(["a", "b"], { center: [0, 0], radius: 0.5 }), box);
    expect(corner(0, 0)).toBe(0);
    expect(corner(150, 0)).toBeCloseTo(1);
    const turned = diamondOffset(diamondGradient(["a", "b"], { angle: 45 }), { x: -10, y: -10, width: 20, height: 20 });
    // Turned 45°, the diamond is a square: its edge runs parallel to the axes.
    expect(turned(5, 5)).toBeCloseTo(turned(5, 0));
  });
});

describe("gradient helpers", () => {
  test("conic and diamond gradients default to the line scope", () => {
    expect(conicGradient(["red", "blue", "red"], { angle: 90 })).toEqual({
      type: "conic",
      angle: 90,
      stops: [
        [0, "red"],
        [0.5, "blue"],
        [1, "red"],
      ],
    });
    expect(paintScope(conicGradient(["a"]))).toBe("line");
    expect(paintScope(diamondGradient(["a"], { scope: "glyph" }))).toBe("glyph");
  });

  test("linearGradient passes reflect through", () => {
    expect(linearGradient(["a", "b"], { reflect: true }).reflect).toBe(true);
  });
});

describe("shapeOffsets", () => {
  // One row of field pixels: inside the glyph (negative) to outside (positive).
  const field = new Float32Array([-3, -0.5, 0.5, 4]);
  const offsets = (strokeWidth: number, position: "outside" | "inside" | "center", size = 6) =>
    [...shapeOffsets(field, 4, 1, 1, strokeWidth, position, size)].map((value) => Math.round(value * 1000) / 1000);

  test("outside strokes run from the glyph's edge to the outer edge", () => {
    expect(offsets(4, "outside")).toEqual([0, 0, 0.125, 1]);
  });

  test("inside strokes run inward", () => {
    expect(offsets(4, "inside")).toEqual([0.75, 0.125, 0, 0]);
  });

  test("centered strokes run from the inner edge to the outer edge", () => {
    expect(offsets(4, "center")).toEqual([0, 0.375, 0.625, 1]);
  });

  test("fills run `size` inward", () => {
    expect(offsets(0, "outside")).toEqual([0.5, 0.083, 0, 0]);
  });

  test("averages the samples of each pixel", () => {
    const supersampled = new Float32Array([0, 2, 2, 4]);
    expect([...shapeOffsets(supersampled, 2, 2, 2, 4, "outside", 0)]).toEqual([0.5]);
  });
});

describe("shapeGradient", () => {
  test("spreads plain colors and takes no scope", () => {
    const paint = shapeGradient(["#fff", "#000"], { reverse: true });
    expect(paint).toEqual({
      type: "shape",
      reverse: true,
      stops: [
        [0, "#fff"],
        [1, "#000"],
      ],
    });
    expect(paintScope(paint)).toBeNull();
  });
});
