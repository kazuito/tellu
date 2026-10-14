import { describe, expect, test } from "bun:test";
import { layoutText } from "../src/layout/layout";
import { planGroups, runLayers } from "../src/render/groups";
import { plateBoxes } from "../src/render/plate";
import { fill, marker, satin, shadow, shapeGradient, stroke } from "../src/style/helpers";
import {
  boxDecorationPadding,
  boxDecorationUsesEm,
  resolveBoxDecoration,
  resolveLayer,
  resolvePlate,
} from "../src/style/resolve";
import { fakeMeasurer } from "./fakeMeasurer";

describe("resolveLayer", () => {
  test("returns a layer with only px lengths as it is", () => {
    const layer = shadow({ stroke: 8, offset: [4, 4] });
    expect(resolveLayer(layer, 50) === layer).toBe(true);
  });

  test("turns em lengths into px at the given font size", () => {
    const layer = shadow({ stroke: { em: 0.1 }, offset: [{ em: 0.05 }, 3], blur: { em: 0.2 } });
    expect(resolveLayer(layer, 40)).toMatchObject({ stroke: 4, offset: [2, 3], blur: 8 });
  });

  test("resolves shading and shape gradient lengths", () => {
    const shaded = resolveLayer(satin({ offset: [{ em: 0.1 }, { em: 0.1 }], size: { em: 0.2 } }), 50);
    expect(shaded.shading).toMatchObject({ type: "satin", offset: [5, 5], size: 10 });
    const banded = resolveLayer(fill(shapeGradient(["#fff", "#000"], { size: { em: 0.25 } })), 40);
    expect(banded.paint).toMatchObject({ type: "shape", size: 10 });
  });
});

describe("runLayers", () => {
  test("resolves each run at its own font size, after shrink", () => {
    const layout = layoutText(
      {
        text: ["ああ", { text: "いい", style: { fontSize: 20 } }],
        style: { fontSize: 10, layers: [stroke({ em: 0.2 }, "#000"), fill("#fff")] },
        maxWidth: 30,
        maxLines: 1,
        overflow: "shrink",
      },
      fakeMeasurer,
    );
    expect(layout.fontScale).toBeLessThan(1);
    const [small, large] = runLayers(layout);
    expect(small![0]!.stroke).toBeCloseTo(10 * layout.fontScale * 0.2);
    expect(large![0]!.stroke).toBeCloseTo(20 * layout.fontScale * 0.2);
  });

  test("em offsets at different font sizes split a slot's group", () => {
    const layout = layoutText(
      {
        text: ["あ", { text: "い", style: { fontSize: 20 } }],
        style: { fontSize: 10, layers: [shadow({ offset: [{ em: 0.1 }, { em: 0.1 }] }), fill("#fff")] },
      },
      fakeMeasurer,
    );
    expect(planGroups(layout).map((group) => [group.slot, group.members.length])).toEqual([
      [0, 1],
      [0, 1],
      [1, 2],
    ]);
  });
});

describe("plates and box decorations", () => {
  test("a plate's em padding follows the base font size", () => {
    const layout = layoutText({ text: "ああ", style: { fontSize: 10 } }, fakeMeasurer);
    const plate = resolvePlate({ paint: "#000", padding: [{ em: 1 }, { em: 0.5 }], radius: { em: 0.2 } }, 10);
    expect(plate).toMatchObject({ padding: [10, 5], radius: 2 });
    expect(plateBoxes(layout, plate)[0]).toMatchObject({ x: -10, width: 40 });
  });

  test("a box decoration's em lengths follow its font size", () => {
    const decoration = marker("#ff0", { padding: { em: 0.5 }, radius: { em: 0.1 } });
    expect(boxDecorationUsesEm(decoration)).toBe(true);
    expect(boxDecorationUsesEm(marker("#ff0"))).toBe(false);
    expect(boxDecorationPadding(decoration, 20)).toEqual([10, 10]);
    expect(resolveBoxDecoration(decoration, 20).radius).toBe(2);
  });

  test("layout pads a box decoration by its em padding", () => {
    const layout = layoutText(
      { text: "ああ", style: { fontSize: 10, decorations: [marker("#ff0", { padding: [{ em: 1 }, 0] })] } },
      fakeMeasurer,
    );
    expect(layout.decorations[0]!.box).toMatchObject({ x: -10, width: 40 });
  });
});
