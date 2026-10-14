import { describe, expect, test } from "bun:test";
import { layoutText } from "../src/layout/layout";
import { planGroups, repeatCount } from "../src/render/groups";
import { echo, extrude, fill, shadow, stroke } from "../src/style/helpers";
import { resolveLayer } from "../src/style/resolve";
import { stableKey } from "../src/utils/stableKey";
import { fakeMeasurer } from "./fakeMeasurer";

describe("planGroups", () => {
  test("orders groups by slot so every outline sits below every fill", () => {
    const layout = layoutText(
      { text: "あい う", style: { fontSize: 10, layers: [shadow(), stroke(4, "black"), fill("white")] } },
      fakeMeasurer,
    );
    const groups = planGroups(layout);
    expect(groups.map((group) => group.slot)).toEqual([0, 1, 2]);
    expect(groups[1]!.members.map((member) => ("glyph" in member ? member.glyph : -1))).toEqual([0, 1, 3]);
  });

  test("splits a slot when a run changes its effects", () => {
    const layout = layoutText(
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
    const layout = layoutText(
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

describe("repeat", () => {
  test("puts the copies of a layer in a group just below its own", () => {
    const layout = layoutText(
      {
        text: "あい",
        style: { fontSize: 10, layers: [extrude({ depth: 4 }), stroke(4, "black"), fill("white")] },
      },
      fakeMeasurer,
    );
    const groups = planGroups(layout);
    expect(groups.map((group) => [group.slot, group.copies, group.members.length])).toEqual([
      [0, true, 2],
      [0, false, 2],
      [1, false, 2],
      [2, false, 2],
    ]);
  });

  test("counts copies up to 256 and none without repeat", () => {
    expect(repeatCount(resolveLayer(fill("white"), 10))).toBe(0);
    expect(repeatCount(resolveLayer(extrude({ depth: 4.4 }), 10))).toBe(4);
    expect(repeatCount(resolveLayer({ paint: "red", repeat: { count: 1000, offset: [1, 1] } }, 10))).toBe(256);
  });
});

describe("extrude and echo", () => {
  test("extrude steps a pixel at a time toward the angle", () => {
    expect(extrude({ depth: 10, angle: 180, shade: "#333" }).repeat).toEqual({
      count: 10,
      offset: [0, 1],
      tint: "#333",
    });
    expect(extrude({ depth: 3, angle: 90 }).repeat!.offset).toEqual([1, 0]);
  });

  test("echo shifts the layer itself and fades the copies behind it", () => {
    const layer = echo({ count: 3, offset: [5, 5], fade: 0.2 });
    expect(layer).toMatchObject({ offset: [5, 5], opacity: 0.6, repeat: { count: 2, offset: [5, 5], opacity: 0.2 } });
    expect(echo({ count: 1 }).repeat).toBeUndefined();
  });

  test("em offsets of copies resolve at the run's font size", () => {
    const layer = resolveLayer({ paint: "red", repeat: { count: 2, offset: [{ em: 0.1 }, 0] } }, 40);
    expect(layer.repeat!.offset).toEqual([4, 0]);
  });
});
