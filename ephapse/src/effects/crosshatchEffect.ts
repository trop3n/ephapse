/**
 * Crosshatch Effect - Engraving/etching style lines
 */

import { SinglePassEffect } from './singlePassEffect';

export interface CrosshatchOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  density: number;
  angle: number;
  layers: number;
  lineWidth: number;
  invert: boolean;
  randomness: number;
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
}

const DEFAULT_OPTIONS: CrosshatchOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  density: 6,
  angle: 45,
  layers: 4,
  lineWidth: 0.15,
  invert: false,
  randomness: 0,
  foregroundColor: [0, 0, 0],
  backgroundColor: [1, 1, 1],
};

const FRAGMENT_SHADER = `
struct CrosshatchUniforms {
  resolution: vec2f,
  density: f32,
  angle: f32,
  layers: f32,
  lineWidth: f32,
  brightness: f32,
  contrast: f32,
  invert: f32,
  fgColorR: f32,
  fgColorG: f32,
  fgColorB: f32,
  bgColorR: f32,
  bgColorG: f32,
  bgColorB: f32,
  randomness: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: CrosshatchUniforms;

const PI: f32 = 3.14159265359;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + brightness;
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash21(i), hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn hatchPattern(uv: vec2f, angle: f32, spacing: f32, width: f32, seed: f32) -> f32 {
  let s = sin(angle);
  let c = cos(angle);

  let rotatedX = uv.x * c - uv.y * s;
  let rotatedY = uv.x * s + uv.y * c;

  let scaledX = rotatedX * uniforms.resolution.x / spacing;

  var wobble = 0.0;
  if (uniforms.randomness > 0.0) {
    let noiseCoord = vec2f(floor(scaledX) * 0.1 + seed * 7.0, rotatedY * 0.02);
    wobble = (valueNoise(noiseCoord * 3.0) - 0.5) * uniforms.randomness * 0.4;
  }

  let linePos = fract(scaledX + wobble);
  let distToLine = abs(linePos - 0.5);

  let halfWidth = width * 0.5;
  let aa = 1.5 / uniforms.resolution.x;

  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, distToLine);
}

fn calculateTamWeights(intensity: f32) -> array<f32, 6> {
  var weights: array<f32, 6>;

  let i = intensity * 6.0;

  let w0 = saturate(i);
  let w1 = saturate(i - 1.0);
  let w2 = saturate(i - 2.0);
  let w3 = saturate(i - 3.0);
  let w4 = saturate(i - 4.0);
  let w5 = saturate(i - 5.0);

  weights[0] = w0 - w1;
  weights[1] = w1 - w2;
  weights[2] = w2 - w3;
  weights[3] = w3 - w4;
  weights[4] = w4 - w5;
  weights[5] = w5;

  return weights;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness * 0.005, uniforms.contrast * 0.01);

  var lum = luminance(color);

  if (uniforms.invert > 0.5) {
    lum = 1.0 - lum;
  }

  let darkness = 1.0 - lum;

  let spacing = uniforms.density;
  let width = uniforms.lineWidth;
  let baseAngle = uniforms.angle * PI / 180.0;

  let hatch0 = hatchPattern(texCoord, baseAngle, spacing * 1.5, width * 0.7, 0.0);
  let hatch1_new = hatchPattern(texCoord, baseAngle + PI * 0.5, spacing * 1.5, width * 0.7, 1.0);
  let hatch1 = max(hatch0, hatch1_new);
  let hatch2_new = hatchPattern(texCoord, baseAngle, spacing, width * 0.8, 2.0);
  let hatch2 = max(hatch1, hatch2_new);
  let hatch3_new = hatchPattern(texCoord, baseAngle + PI * 0.5, spacing, width * 0.8, 3.0);
  let hatch3 = max(hatch2, hatch3_new);
  let hatch4_new = hatchPattern(texCoord, baseAngle + PI * 0.25, spacing * 0.85, width * 0.9, 4.0);
  let hatch4 = max(hatch3, hatch4_new);
  let hatch5_new = hatchPattern(texCoord, baseAngle + PI * 0.75, spacing * 0.85, width * 0.9, 5.0);
  let hatch5 = max(hatch4, hatch5_new);

  var level0 = hatch0;
  var level1 = hatch1;
  var level2 = hatch2;
  var level3 = hatch3;
  var level4 = hatch4;
  var level5 = hatch5;

  if (uniforms.layers < 2.0) {
    level1 = level0;
    level2 = level0;
    level3 = level0;
    level4 = level0;
    level5 = level0;
  } else if (uniforms.layers < 3.0) {
    level4 = level3;
    level5 = level3;
  } else if (uniforms.layers < 4.0) {
    level5 = level4;
  }

  let weights = calculateTamWeights(darkness);

  var hatchValue = 0.0;
  hatchValue += level0 * weights[0];
  hatchValue += level1 * weights[1];
  hatchValue += level2 * weights[2];
  hatchValue += level3 * weights[3];
  hatchValue += level4 * weights[4];
  hatchValue += level5 * weights[5];

  let solidFill = smoothstep(0.92, 1.0, darkness);
  hatchValue = max(hatchValue, solidFill);

  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  let finalColor = mix(bgColor, fgColor, hatchValue);
  return vec4f(finalColor, 1.0);
}
`;

export class CrosshatchEffect extends SinglePassEffect<CrosshatchOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<CrosshatchOptions> = {}) {
    super(device, format, { ...DEFAULT_OPTIONS, ...options });
  }
  
  protected getFragmentShader(): string {
    return FRAGMENT_SHADER;
  }
  
  protected getUniformBufferSize(): number {
    return 64;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(16);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.density;
    data[3] = this.options.angle;
    data[4] = this.options.layers;
    data[5] = this.options.lineWidth;
    data[6] = this.options.brightness;
    data[7] = this.options.contrast;
    data[8] = this.options.invert ? 1 : 0;
    data[9] = this.options.foregroundColor[0];
    data[10] = this.options.foregroundColor[1];
    data[11] = this.options.foregroundColor[2];
    data[12] = this.options.backgroundColor[0];
    data[13] = this.options.backgroundColor[1];
    data[14] = this.options.backgroundColor[2];
    data[15] = this.options.randomness;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
