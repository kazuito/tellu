import { describe, expect, test } from "bun:test";
import { layoutTelop } from "../src/layout/layout";
import { planGroups } from "../src/render/groups";
import { fill, shadow, stroke } from "../src/style/helpers";
import { stableKey } from "../src/utils/stableKey";
import { fakeMeasurer } from "./fakeMeasurer";

describe("planGroups", () => {
  test("orders groups by slot so every outline sits below every fill", () => {
    const layout = layoutTelop(
      { text: "あい う", style: { fontSize: 10, layers: [shadow(), stroke(4, "black"), fill("white")] } },
      fakeMeasurer,
    );
    const groups = planGroups(layout);
    expect(groups.map((group) => group.slot)).toEqual([0, 1, 2]);
    expect(groups[1]!.members.map((member) => member.glyph)).toEqual([0, 1, 3]);
  });

  test("splits a slot when a run changes its effects", () => {
    const layout = layoutTelop(
      {
        text: ["あ", { text: "い", style: { layers: { 0: { blur: 6 }, 1: { paint: "red" } } } }],
        style: { fontSize: 10, layers: [stroke(4, "black"), fill("white")] },
      },
      fakeMeasurer,
    );
    const groups = planGroups(layout);
    expect(groups.map((group) => [group.slot, group.members.length])).toEqual([
      [0, 1],
      [0, 1],
      [1, 2],
    ]);
  });

  test("skips hidden layers", () => {
    const layout = layoutTelop(
      { text: "あ", style: { layers: [stroke(4, "black", { visible: false }), fill("white")] } },
      fakeMeasurer,
    );
    expect(planGroups(layout).map((group) => group.slot)).toEqual([1]);
  });
});

describe("stableKey", () => {
  test("is structural for plain data and order independent", () => {
    expect(stableKey({ a: 1, b: [1, { c: "x" }] })).toBe(stableKey({ b: [1, { c: "x" }], a: 1, d: undefined }));
  });

  test("uses identity for class instances", () => {
    class Filter {}
    const filter = new Filter();
    expect(stableKey({ filters: [filter] })).toBe(stableKey({ filters: [filter] }));
    expect(stableKey({ filters: [filter] })).not.toBe(stableKey({ filters: [new Filter()] }));
  });
});
