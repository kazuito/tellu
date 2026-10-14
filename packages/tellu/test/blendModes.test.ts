import { describe, expect, test } from "bun:test";
import { SHADER_BLEND_MODES, shaderBlendMode } from "../src/render/blendModes";
import type { BlendMode } from "../src/style/types";

describe("shaderBlendMode", () => {
  test("leaves the modes the GPU blends exactly to it", () => {
    for (const mode of [undefined, "normal", "add", "screen", "erase"] as const) expect(shaderBlendMode(mode)).toBe(0);
  });

  test("numbers every other mode from 1, as the shader does", () => {
    expect(shaderBlendMode("multiply")).toBe(1);
    expect(shaderBlendMode("overlay")).toBe(2);
    expect(shaderBlendMode("hue")).toBe(11);
    expect(shaderBlendMode("luminosity")).toBe(14);
    expect(shaderBlendMode("divide")).toBe(22);
    expect(new Set(SHADER_BLEND_MODES.map(shaderBlendMode)).size).toBe(SHADER_BLEND_MODES.length);
  });

  test("leaves unknown names to PixiJS", () => {
    expect(shaderBlendMode("normal-npm" as BlendMode)).toBe(0);
  });
});
