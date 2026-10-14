import { defaultFilterVert, Filter, GlProgram, GpuProgram, Texture, UniformGroup } from "pixi.js";
import type { BlendMode } from "../style/types";
import { shaderBlendMode } from "./blendModes";

// Blend functions of the W3C Compositing and Blending spec, plus Photoshop's linear, vivid, pin, hard mix, subtract and
// divide. `b` is the backdrop's color and `s` the source's, both unpremultiplied. Modes are numbered as in
// `SHADER_BLEND_MODES`.
const glslFunctions = `
float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }

vec3 clipColor(vec3 c) {
  float l = lum(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = l + (c - l) * l / (l - n);
  if (x > 1.0) c = l + (c - l) * (1.0 - l) / (x - l);
  return c;
}

vec3 setLum(vec3 c, float l) { return clipColor(c + (l - lum(c))); }

float sat(vec3 c) { return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b); }

vec3 setSat(vec3 c, float s) {
  float high = max(max(c.r, c.g), c.b);
  float low = min(min(c.r, c.g), c.b);
  return high > low ? (c - low) * s / (high - low) : vec3(0.0);
}

float screen(float b, float s) { return b + s - b * s; }

float colorDodge(float b, float s) {
  if (b <= 0.0) return 0.0;
  if (s >= 1.0) return 1.0;
  return min(1.0, b / (1.0 - s));
}

float colorBurn(float b, float s) {
  if (b >= 1.0) return 1.0;
  if (s <= 0.0) return 0.0;
  return 1.0 - min(1.0, (1.0 - b) / s);
}

float hardLight(float b, float s) { return s <= 0.5 ? b * 2.0 * s : screen(b, 2.0 * s - 1.0); }

float softLight(float b, float s) {
  if (s <= 0.5) return b - (1.0 - 2.0 * s) * b * (1.0 - b);
  float d = b <= 0.25 ? ((16.0 * b - 12.0) * b + 4.0) * b : sqrt(b);
  return b + (2.0 * s - 1.0) * (d - b);
}

float separable(int mode, float b, float s) {
  if (mode == 1) return b * s;
  if (mode == 2) return hardLight(s, b);
  if (mode == 3) return min(b, s);
  if (mode == 4) return max(b, s);
  if (mode == 5) return colorDodge(b, s);
  if (mode == 6) return colorBurn(b, s);
  if (mode == 7) return hardLight(b, s);
  if (mode == 8) return softLight(b, s);
  if (mode == 9) return abs(b - s);
  if (mode == 10) return b + s - 2.0 * b * s;
  if (mode == 15) return max(0.0, b + s - 1.0);
  if (mode == 16) return min(1.0, b + s);
  if (mode == 17) return b + 2.0 * s - 1.0;
  if (mode == 18) return s <= 0.5 ? colorBurn(b, 2.0 * s) : colorDodge(b, 2.0 * s - 1.0);
  if (mode == 19) return s <= 0.5 ? min(b, 2.0 * s) : max(b, 2.0 * s - 1.0);
  if (mode == 20) return b + s >= 1.0 ? 1.0 : 0.0;
  if (mode == 21) return max(0.0, b - s);
  if (mode == 22) return s <= 0.0 ? (b <= 0.0 ? 0.0 : 1.0) : min(1.0, b / s);
  return s;
}

vec3 blendColor(int mode, vec3 b, vec3 s) {
  if (mode == 11) return setLum(setSat(s, sat(b)), lum(b));
  if (mode == 12) return setLum(setSat(b, sat(s)), lum(b));
  if (mode == 13) return setLum(s, lum(b));
  if (mode == 14) return setLum(b, lum(s));
  return vec3(separable(mode, b.r, s.r), separable(mode, b.g, s.g), separable(mode, b.b, s.b));
}
`;

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uBackTexture;
uniform int uMode;
${glslFunctions}
void main() {
  vec4 source = texture(uTexture, vTextureCoord);
  vec4 back = texture(uBackTexture, vTextureCoord);
  vec3 cs = source.a > 0.0 ? source.rgb / source.a : vec3(0.0);
  vec3 cb = back.a > 0.0 ? back.rgb / back.a : vec3(0.0);
  // Where the backdrop is transparent the source shows as it is; where it is opaque, blended.
  vec3 mixed = (1.0 - back.a) * cs + back.a * clamp(blendColor(uMode, cb, cs), 0.0, 1.0);
  // The result replaces what was below (the filter draws with blend mode "none"), so composite it over the backdrop.
  finalColor = vec4(source.a * mixed + (1.0 - source.a) * back.rgb, source.a + back.a * (1.0 - source.a));
}
`;

const source = `
struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct BlendUniforms {
  uMode:i32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;
@group(0) @binding(3) var uBackTexture: texture_2d<f32>;

@group(1) @binding(0) var<uniform> blendUniforms : BlendUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
};

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord(aPosition:vec2<f32>) -> vec2<f32>
{
  return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(@location(0) aPosition : vec2<f32>) -> VSOutput {
  return VSOutput(filterVertexPosition(aPosition), filterTextureCoord(aPosition));
}

fn lum(c: vec3<f32>) -> f32 { return dot(c, vec3<f32>(0.3, 0.59, 0.11)); }

fn clipColor(color: vec3<f32>) -> vec3<f32> {
  var c = color;
  let l = lum(c);
  let n = min(min(c.r, c.g), c.b);
  let x = max(max(c.r, c.g), c.b);
  if (n < 0.0) { c = l + (c - l) * l / (l - n); }
  if (x > 1.0) { c = l + (c - l) * (1.0 - l) / (x - l); }
  return c;
}

fn setLum(c: vec3<f32>, l: f32) -> vec3<f32> { return clipColor(c + (l - lum(c))); }

fn sat(c: vec3<f32>) -> f32 { return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b); }

fn setSat(c: vec3<f32>, s: f32) -> vec3<f32> {
  let high = max(max(c.r, c.g), c.b);
  let low = min(min(c.r, c.g), c.b);
  if (high > low) { return (c - low) * s / (high - low); }
  return vec3<f32>(0.0);
}

fn screen(b: f32, s: f32) -> f32 { return b + s - b * s; }

fn colorDodge(b: f32, s: f32) -> f32 {
  if (b <= 0.0) { return 0.0; }
  if (s >= 1.0) { return 1.0; }
  return min(1.0, b / (1.0 - s));
}

fn colorBurn(b: f32, s: f32) -> f32 {
  if (b >= 1.0) { return 1.0; }
  if (s <= 0.0) { return 0.0; }
  return 1.0 - min(1.0, (1.0 - b) / s);
}

fn hardLight(b: f32, s: f32) -> f32 {
  if (s <= 0.5) { return b * 2.0 * s; }
  return screen(b, 2.0 * s - 1.0);
}

fn softLight(b: f32, s: f32) -> f32 {
  if (s <= 0.5) { return b - (1.0 - 2.0 * s) * b * (1.0 - b); }
  var d = sqrt(b);
  if (b <= 0.25) { d = ((16.0 * b - 12.0) * b + 4.0) * b; }
  return b + (2.0 * s - 1.0) * (d - b);
}

fn separable(mode: i32, b: f32, s: f32) -> f32 {
  switch mode {
    case 1: { return b * s; }
    case 2: { return hardLight(s, b); }
    case 3: { return min(b, s); }
    case 4: { return max(b, s); }
    case 5: { return colorDodge(b, s); }
    case 6: { return colorBurn(b, s); }
    case 7: { return hardLight(b, s); }
    case 8: { return softLight(b, s); }
    case 9: { return abs(b - s); }
    case 10: { return b + s - 2.0 * b * s; }
    case 15: { return max(0.0, b + s - 1.0); }
    case 16: { return min(1.0, b + s); }
    case 17: { return b + 2.0 * s - 1.0; }
    case 18: {
      if (s <= 0.5) { return colorBurn(b, 2.0 * s); }
      return colorDodge(b, 2.0 * s - 1.0);
    }
    case 19: {
      if (s <= 0.5) { return min(b, 2.0 * s); }
      return max(b, 2.0 * s - 1.0);
    }
    case 20: { return select(0.0, 1.0, b + s >= 1.0); }
    case 21: { return max(0.0, b - s); }
    case 22: {
      if (s <= 0.0) { return select(1.0, 0.0, b <= 0.0); }
      return min(1.0, b / s);
    }
    default: { return s; }
  }
}

fn blendColor(mode: i32, b: vec3<f32>, s: vec3<f32>) -> vec3<f32> {
  switch mode {
    case 11: { return setLum(setSat(s, sat(b)), lum(b)); }
    case 12: { return setLum(setSat(b, sat(s)), lum(b)); }
    case 13: { return setLum(s, lum(b)); }
    case 14: { return setLum(b, lum(s)); }
    default: {
      return vec3<f32>(separable(mode, b.r, s.r), separable(mode, b.g, s.g), separable(mode, b.b, s.b));
    }
  }
}

@fragment
fn mainFragment(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let source = textureSample(uTexture, uSampler, uv);
  let back = textureSample(uBackTexture, uSampler, uv);
  var cs = vec3<f32>(0.0);
  if (source.a > 0.0) { cs = source.rgb / source.a; }
  var cb = vec3<f32>(0.0);
  if (back.a > 0.0) { cb = back.rgb / back.a; }
  let mixed = (1.0 - back.a) * cs + back.a * clamp(blendColor(blendUniforms.uMode, cb, cs), vec3<f32>(0.0), vec3<f32>(1.0));
  return vec4<f32>(source.a * mixed + (1.0 - source.a) * back.rgb, source.a + back.a * (1.0 - source.a));
}
`;

let programs: { glProgram: GlProgram; gpuProgram: GpuProgram } | undefined;

/**
 * Blends what it filters with the pixels below it, in any of the modes the GPU's blend equation can't compute
 * (`multiply`, `overlay`, `hue`, …), following the W3C Compositing and Blending spec: where the backdrop is
 * transparent, the source shows unchanged. It reads the backdrop (`blendRequired`), which a WebGL renderer only allows
 * with `useBackBuffer: true`.
 */
export class BlendFilter extends Filter {
  constructor(mode: BlendMode) {
    programs ??= {
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment, name: "tellu-blend-filter" }),
      gpuProgram: GpuProgram.from({
        vertex: { source, entryPoint: "mainVertex" },
        fragment: { source, entryPoint: "mainFragment" },
      }),
    };
    super({
      ...programs,
      resolution: "inherit",
      blendRequired: true,
      resources: {
        blendUniforms: new UniformGroup({ uMode: { value: shaderBlendMode(mode), type: "i32" } }),
        uBackTexture: Texture.EMPTY,
      },
    });
    // The output already holds the backdrop, so it replaces what was there.
    this.blendMode = "none";
  }
}
