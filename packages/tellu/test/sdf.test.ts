import { describe, expect, test } from "bun:test";
import { signedDistanceField, strokeCoverage } from "../src/render/sdf";
import type { Shading } from "../src/style/types";

test("signed distance field measures distance to a square's edge", () => {
  const size = 21;
  const alpha = new Uint8ClampedArray(size * size * 4);
  for (let y = 8; y <= 12; y++) for (let x = 8; x <= 12; x++) alpha[(y * size + x) * 4 + 3] = 255;
  const field = signedDistanceField(alpha, size, size);
  expect(field[10 * size + 10]).toBeCloseTo(-2.5);
  expect(field[10 * size + 15]).toBeCloseTo(2.5);
  expect(field[10 * size + 8]).toBeCloseTo(-0.5);

  const coverage = strokeCoverage(field, size, size, 1, 3, "outside");
  expect(coverage[(10 * size + 15) * 4 + 3]).toBe(255);
  expect(coverage[(10 * size + 18) * 4 + 3]).toBe(0);
});

describe("shading", () => {
  const size = 41;
  const alpha = new Uint8ClampedArray(size * size * 4);
  for (let y = 10; y <= 30; y++) for (let x = 10; x <= 30; x++) alpha[(y * size + x) * 4 + 3] = 255;
  const field = signedDistanceField(alpha, size, size);
  const shade = (shading: Shading) => {
    const coverage = strokeCoverage(field, size, size, 1, 0, "outside", shading);
    return (x: number, y: number) => coverage[(y * size + x) * 4 + 3]!;
  };

  test("an inset shadow paints the edge it was shifted away from", () => {
    const at = shade({ type: "inset", offset: [0, 3], size: 1 });
    expect(at(20, 11)).toBe(255);
    expect(at(20, 29)).toBe(0);
    expect(at(20, 20)).toBe(0);
    expect(at(20, 5)).toBe(0);
  });

  test("a bevel lights the faces turned toward the light and leaves the inside flat", () => {
    const highlight = shade({ type: "bevel", size: 4, angle: 315 });
    const shadow = shade({ type: "bevel", side: "shadow", size: 4, angle: 315 });
    for (const [x, y] of [
      [20, 11],
      [11, 20],
    ] as const) {
      expect(highlight(x, y)).toBeGreaterThan(100);
      expect(shadow(x, y)).toBe(0);
    }
    for (const [x, y] of [
      [20, 29],
      [29, 20],
    ] as const) {
      expect(shadow(x, y)).toBeGreaterThan(100);
      expect(highlight(x, y)).toBe(0);
    }
    expect(highlight(20, 20)).toBe(0);
    expect(shadow(20, 20)).toBe(0);
  });

  test("satin paints where the shifted copies differ", () => {
    const at = shade({ type: "satin", offset: [3, 0], size: 2 });
    expect(at(11, 20)).toBeGreaterThan(200);
    expect(at(20, 20)).toBe(0);
    expect(shade({ type: "satin", offset: [3, 0], size: 2, invert: true })(20, 20)).toBe(255);
  });
});
