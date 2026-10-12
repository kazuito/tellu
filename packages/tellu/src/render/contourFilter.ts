import { defaultFilterVert, Filter, GlProgram, GpuProgram, UniformGroup } from "pixi.js";
import type { Contour } from "../style/types";
import { CONTOUR_SAMPLES, sampleContour } from "./contour";

// The curve is passed as vec4s: WGSL uniform arrays need 16-byte elements.
const VECTORS = CONTOUR_SAMPLES / 4;

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uCurve[${VECTORS}];
uniform float uNoise;

// Linear interpolation of the samples at x (0 … ${CONTOUR_SAMPLES - 1}), as a sum of hat functions: loops with
// constant bounds index uniform arrays on every GLSL version.
float curveAt(float x) {
  float result = 0.0;
  for (int k = 0; k < ${VECTORS}; k++) {
    vec4 weights = max(vec4(0.0), 1.0 - abs(vec4(x) - (float(k) * 4.0 + vec4(0.0, 1.0, 2.0, 3.0))));
    result += dot(uCurve[k], weights);
  }
  return result;
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec4 color = texture(uTexture, vTextureCoord);
  float alpha = color.a;
  if (alpha <= 0.0) {
    finalColor = vec4(0.0);
    return;
  }
  vec3 rgb = color.rgb / alpha;
  float mapped = curveAt(clamp(alpha, 0.0, 1.0) * ${CONTOUR_SAMPLES - 1}.0);
  // Speckles fixed to the output pixels, so the same frame always gets the same noise.
  mapped *= 1.0 - uNoise * hash(floor(gl_FragCoord.xy));
  finalColor = vec4(rgb * mapped, mapped);
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

struct ContourUniforms {
  uCurve:array<vec4<f32>, ${VECTORS}>,
  uNoise:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> contourUniforms : ContourUniforms;

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

fn curveAt(x: f32) -> f32 {
  var result = 0.0;
  for (var k = 0; k < ${VECTORS}; k++) {
    let weights = max(vec4<f32>(0.0), 1.0 - abs(vec4<f32>(x) - (f32(k) * 4.0 + vec4<f32>(0.0, 1.0, 2.0, 3.0))));
    result += dot(contourUniforms.uCurve[k], weights);
  }
  return result;
}

fn hash(p: vec2<f32>) -> f32 {
  var q = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

@fragment
fn mainFragment(@location(0) uv: vec2<f32>, @builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let color = textureSample(uTexture, uSampler, uv);
  let alpha = color.a;
  if (alpha <= 0.0) {
    return vec4<f32>(0.0);
  }
  let rgb = color.rgb / alpha;
  var mapped = curveAt(clamp(alpha, 0.0, 1.0) * ${CONTOUR_SAMPLES - 1}.0);
  mapped *= 1.0 - contourUniforms.uNoise * hash(floor(position.xy));
  return vec4<f32>(rgb * mapped, mapped);
}
`;

let programs: { glProgram: GlProgram; gpuProgram: GpuProgram } | undefined;

/**
 * Remaps the opacity of what it filters through a contour curve, then speckles it with noise. Colors keep their
 * hue: the filter works on unpremultiplied color.
 */
export class ContourFilter extends Filter {
  constructor(contour: Contour | undefined, noise: number) {
    programs ??= {
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment, name: "tellu-contour-filter" }),
      gpuProgram: GpuProgram.from({
        vertex: { source, entryPoint: "mainVertex" },
        fragment: { source, entryPoint: "mainFragment" },
      }),
    };
    const curve = sampleContour(contour ?? "linear");
    super({
      ...programs,
      resolution: "inherit",
      resources: {
        contourUniforms: new UniformGroup({
          uCurve: { value: curve, type: "vec4<f32>", size: VECTORS },
          uNoise: { value: Math.min(1, Math.max(0, noise)), type: "f32" },
        }),
      },
    });
  }
}
