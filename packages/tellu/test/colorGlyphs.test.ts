import { describe, expect, test } from "bun:test";
import { hasColorPixels, keepsGlyphColors as resolvedKeepsGlyphColors } from "../src/render/rasterize";
import { defaultStyle } from "../src/style/defaults";
import { fill, innerShadow, shapeGradient, stroke } from "../src/style/helpers";
import { resolveLayer } from "../src/style/resolve";
import type { Layer } from "../src/style/types";

const keepsGlyphColors = (layer: Layer) => resolvedKeepsGlyphColors(resolveLayer(layer, 64));
const pixels = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());

describe("hasColorPixels", () => {
  test("finds no colors in a glyph drawn in black, edges included", () => {
    expect(hasColorPixels(pixels([0, 0, 0, 255], [0, 0, 0, 40], [0, 0, 0, 0]))).toBe(false);
  });

  test("finds colors a font drew itself", () => {
    expect(hasColorPixels(pixels([0, 0, 0, 255], [250, 200, 40, 255]))).toBe(true);
  });

  test("ignores the color of fully transparent pixels", () => {
    expect(hasColorPixels(pixels([255, 0, 0, 0]))).toBe(false);
  });
});

describe("keepsGlyphColors", () => {
  test("fill() and the default style keep color glyphs", () => {
    expect(keepsGlyphColors(fill("#fff"))).toBe(true);
    expect(keepsGlyphColors(defaultStyle.layers[0]!)).toBe(true);
  });

  test("other layers paint them unless they ask to keep them", () => {
    expect(keepsGlyphColors({ paint: "#fff" })).toBe(false);
    expect(keepsGlyphColors(fill("#fff", { colorGlyphs: "paint" }))).toBe(false);
    expect(keepsGlyphColors({ paint: "#000", offset: [4, 4], blur: 4, colorGlyphs: "keep" })).toBe(true);
  });

  test("only applies to layers that paint the glyph itself", () => {
    expect(keepsGlyphColors(stroke(8, "#000", { colorGlyphs: "keep" }))).toBe(false);
    expect(keepsGlyphColors(fill("#000", { strokePosition: "inside" }))).toBe(false);
    expect(keepsGlyphColors(innerShadow({ colorGlyphs: "keep" }))).toBe(false);
    expect(keepsGlyphColors(fill(shapeGradient(["#fff", "#000"])))).toBe(false);
  });
});
