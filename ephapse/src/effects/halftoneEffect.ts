/**
 * Halftone Effect - Newspaper-style dot patterns
 */

import { SinglePassEffect } from './singlePassEffect';

export interface HalftoneOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  dotScale: number;
  spacing: number;
  angle: number;
  shape: number;
  invert: boolean;
  colorMode: boolean;
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
}

const DEFAULT_OPTIONS: HalftoneOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  dotScale: 1,
  spacing: 8,
  angle: 45,
  shape: 0,
  invert: false,
  colorMode: false,
  foregroundColor: [0, 0, 0],
  backgroundColor: [1, 1, 1],
};

const FRAGMENT_SHADER = `
struct HalftoneUniforms {
  resolution: vec2f,
  dotScale: f32,
  angle: f32,
  shape: f32,
  spacing: f32,
  invert: f32,
  colorMode: f32,
  bgColorR: f32,
  bgColorG: f32,
  bgColorB: f32,
  fgColorR: f32,
  fgColorG: f32,
  fgColorB: f32,
  brightness: f32,
  contrast: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: HalftoneUniforms;

const PI: f32 = 3.14159265359;
const LUMA_R: f32 = 0.299;
const LUMA_G: f32 = 0.587;
const LUMA_B: f32 = 0.114;

fn luminance(c: vec3f) -> f32 {
  return c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
}

fn applyBrightnessContrast(color: vec3f, brightnessOffset: f32, contrastFactor: f32) -> vec3f {
  let result = (color + brightnessOffset - 0.5) * contrastFactor + 0.5;
  return saturate(result);
}

fn aastep(threshold: f32, value: f32) -> f32 {
  let afwidth = 0.7 * length(vec2f(dpdx(value), dpdy(value)));
  return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

fn halftonePattern(fragCoord: vec2f, frequency: f32, angle: f32, value: f32, shape: i32) -> f32 {
  let s = sin(angle);
  let c = cos(angle);
  let rotated = vec2f(
    fragCoord.x * c - fragCoord.y * s,
    fragCoord.x * s + fragCoord.y * c
  );

  let scaled = rotated * frequency;
  let nearest = scaled - floor(scaled) - 0.5;

  var dist: f32;
  if (shape == 0) {
    dist = length(nearest);
  } else if (shape == 1) {
    dist = max(abs(nearest.x), abs(nearest.y));
  } else if (shape == 2) {
    dist = abs(nearest.x) + abs(nearest.y);
  } else {
    dist = abs(nearest.y);
  }

  let radius = sqrt(value) * 0.5;
  return aastep(radius, dist);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let contrastFactor = (1.0 + uniforms.contrast * 0.01) / (1.0 - uniforms.contrast * 0.0099);
  let frequency = 1.0 / uniforms.spacing;
  let shapeInt = i32(uniforms.shape + 0.5);
  let doInvert = uniforms.invert > 0.5;
  let isColorMode = uniforms.colorMode > 0.5;

  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness * 0.005, contrastFactor);

  let fragCoord = texCoord * uniforms.resolution;
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);

  var lum = luminance(color);
  lum = select(lum, 1.0 - lum, doInvert);

  let angleRad = uniforms.angle * PI / 180.0;
  let pattern = halftonePattern(fragCoord, frequency, angleRad, lum, shapeInt);

  let colorModeResult = mix(color, bgColor, pattern);
  let bwModeResult = mix(fgColor, bgColor, pattern);
  let finalColor = select(bwModeResult, colorModeResult, isColorMode);

  return vec4f(finalColor, 1.0);
}
`;

export class HalftoneEffect extends SinglePassEffect<HalftoneOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<HalftoneOptions> = {}) {
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
    data[2] = this.options.dotScale;
    data[3] = this.options.angle;
    data[4] = this.options.shape;
    data[5] = this.options.spacing;
    data[6] = this.options.invert ? 1 : 0;
    data[7] = this.options.colorMode ? 1 : 0;
    data[8] = this.options.backgroundColor[0];
    data[9] = this.options.backgroundColor[1];
    data[10] = this.options.backgroundColor[2];
    data[11] = this.options.foregroundColor[0];
    data[12] = this.options.foregroundColor[1];
    data[13] = this.options.foregroundColor[2];
    data[14] = this.options.brightness;
    data[15] = this.options.contrast;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
