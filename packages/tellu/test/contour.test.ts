import { describe, expect, test } from "bun:test";
import { CONTOUR_SAMPLES, contourFunction, curveThrough, readContour, sampleContour } from "../src/render/contour";
import { effectsKey } from "../src/render/groups";
import { bevel, glow, innerGlow, innerShadow, satin } from "../src/style/helpers";
import type { ContourPreset } from "../src/style/types";
import { stableKey } from "../src/utils/stableKey";

describe("contour presets", () => {
  const presets: ContourPreset[] = [
    "linear",
    "cone",
    "cone-inverted",
    "gaussian",
    "half-round",
    "ring",
    "ring-double",
    "sawtooth",
  ];

  test("stay within 0 … 1", () => {
    for (const preset of presets) {
      const curve = contourFunction(preset);
      for (let x = 0; x <= 1; x += 0.01) {
        expect(curve(x)).toBeGreaterThanOrEqual(0);
        expect(curve(x)).toBeLessThanOrEqual(1 + 1e-12);
      }
    }
  });

  test("shapes", () => {
    const at = (preset: ContourPreset, x: number) => contourFunction(preset)(x);
    expect([at("linear", 0), at("linear", 0.3), at("linear", 1)]).toEqual([0, 0.3, 1]);
    expect([at("cone", 0), at("cone", 0.5), at("cone", 1)]).toEqual([0, 1, 0]);
    expect([at("cone-inverted", 0), at("cone-inverted", 0.5), at("cone-inverted", 1)]).toEqual([1, 0, 1]);
    expect(at("gaussian", 0.5)).toBeCloseTo(0.5);
    expect(at("gaussian", 0.1)).toBeLessThan(0.1);
    expect(at("half-round", 0.5)).toBeGreaterThan(0.5);
    expect(at("ring", 0.5)).toBeCloseTo(1);
    expect(at("ring-double", 0.25)).toBeCloseTo(1);
    expect(at("ring-double", 0.5)).toBeCloseTo(0);
    expect([at("sawtooth", 0.25), at("sawtooth", 0.75), at("sawtooth", 1)]).toEqual([0.5, 0.5, 1]);
  });

  test("unknown presets throw", () => {
    expect(() => contourFunction("nope" as ContourPreset)).toThrow();
  });
});

describe("custom contours", () => {
  test("pass through their points", () => {
    const curve = curveThrough([
      [0, 0],
      [0.5, 1],
      [1, 0.2],
    ]);
    expect(curve(0)).toBe(0);
    expect(curve(0.5)).toBe(1);
    expect(curve(1)).toBeCloseTo(0.2);
  });

  test("are flat outside their points, sorted and clamped", () => {
    const curve = curveThrough([
      [0.8, 0.9],
      [0.2, 2],
    ]);
    expect(curve(0)).toBe(1);
    expect(curve(1)).toBe(0.9);
  });

  test("two points make a straight line", () => {
    const curve = curveThrough([
      [0, 1],
      [1, 0],
    ]);
    expect(curve(0.25)).toBeCloseTo(0.75);
  });
});

describe("sampled contours", () => {
  test("hold CONTOUR_SAMPLES values and read back by interpolation", () => {
    const samples = sampleContour("cone");
    expect(samples).toHaveLength(CONTOUR_SAMPLES);
    expect(readContour(samples, 0)).toBe(0);
    expect(readContour(samples, 1)).toBeCloseTo(0);
    expect(readContour(sampleContour("linear"), 0.37)).toBeCloseTo(0.37, 5);
  });
});

describe("contour on layers", () => {
  test("shading helpers put their contour on the shading", () => {
    expect(innerShadow({ contour: "ring" })).toMatchObject({ shading: { type: "inset", contour: "ring" } });
    expect(innerShadow({ contour: "ring" }).contour).toBeUndefined();
    expect(innerGlow({ contour: "cone" }).shading).toMatchObject({ contour: "cone" });
    expect(satin({ contour: "gaussian" }).shading).toMatchObject({ contour: "gaussian" });
    expect(bevel({ contour: "half-round" }).map((layer) => layer.shading?.contour)).toEqual([
      "half-round",
      "half-round",
    ]);
    expect("contour" in innerGlow().shading!).toBe(false);
  });

  test("other helpers put it on the layer", () => {
    expect(glow({ contour: "ring", noise: 0.3 })).toMatchObject({ contour: "ring", noise: 0.3 });
  });

  test("contour and noise split slot groups, and leave other effect keys alone", () => {
    const plain = glow();
    expect(effectsKey(glow({ contour: "ring" }))).not.toBe(effectsKey(plain));
    expect(effectsKey(glow({ noise: 0.5 }))).not.toBe(effectsKey(plain));
    // Same key as before contours existed.
    expect(effectsKey(plain)).toBe(
      stableKey([plain.offset, plain.blur, plain.blurQuality, plain.opacity, plain.blendMode, plain.filters]),
    );
  });
});
