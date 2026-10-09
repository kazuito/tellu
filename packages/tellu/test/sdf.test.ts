import { expect, test } from "bun:test";
import { signedDistanceField, strokeCoverage } from "../src/render/sdf";

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
