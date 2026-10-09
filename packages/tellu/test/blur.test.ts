import { expect, test } from "bun:test";
import { blurPadding, blurReach } from "../src/render/blur";

test("one blur pass reaches two kernel steps", () => {
  expect(blurReach(8, 1)).toBeCloseTo(16);
});

test("halving passes reach further than Pixi's default padding", () => {
  expect(blurReach(8, 4)).toBeCloseTo(26.04, 1);
  expect(blurPadding(8, 4)).toBe(28);
});

test("quality below one still counts as a single pass", () => {
  expect(blurReach(10, 0)).toBeCloseTo(20);
});
