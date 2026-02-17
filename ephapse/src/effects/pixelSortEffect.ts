/**
 * Pixel Sort Effect - Kim Asendorf style pixel sorting
 */

import { SinglePassEffect } from './singlePassEffect';

export interface PixelSortOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  threshold: number;
  direction: number;
  mode: number;
  streakLength: number;
  intensity: number;
  randomness: number;
  reverse: boolean;
}

const DEFAULT_OPTIONS: PixelSortOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  threshold: 0.5,
  direction: 0,
  mode: 0,
  streakLength: 50,
  intensity: 1,
  randomness: 0,
  reverse: false,
};

const FRAGMENT_SHADER = `
struct PixelSortUniforms {
  resolution: vec2f,
  threshold: f32,
  direction: f32,
  mode: f32,
  streakLength: f32,
  intensity: f32,
  randomness: f32,
  reverse: f32,
  brightness: f32,
  contrast: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: PixelSortUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brt: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brt);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;
  let currentColor = textureSampleLevel(inputTexture, texSampler, texCoord, 0.0).rgb;
  let currentLum = luminance(currentColor);

  let thresholdValue = uniforms.threshold;
  let modeInt = i32(uniforms.mode + 0.5);
  
  var shouldSort = false;
  if (modeInt == 0) {
    shouldSort = currentLum > thresholdValue * 0.3;
  } else if (modeInt == 1) {
    shouldSort = currentLum < 1.0 - thresholdValue * 0.3;
  } else if (modeInt == 2) {
    shouldSort = currentLum > thresholdValue;
  } else {
    shouldSort = currentLum < thresholdValue;
  }

  if (!shouldSort) {
    return vec4f(applyBrightnessContrast(currentColor, uniforms.brightness * 0.005, uniforms.contrast * 0.01), 1.0);
  }

  var dir: vec2f;
  if (uniforms.direction > 1.5) {
    dir = normalize(vec2f(1.0, 1.0));
  } else if (uniforms.direction > 0.5) {
    dir = vec2f(0.0, 1.0);
  } else {
    dir = vec2f(1.0, 0.0);
  }

  let sampleCount = min(i32(uniforms.streakLength), 32);
  let halfRange = sampleCount / 2;

  var sumColor = vec3f(0.0);
  var count = 0;

  for (var i = -halfRange; i <= halfRange; i++) {
    let offset = dir * pixelSize * f32(i);
    let sampleUV = clamp(texCoord + offset, vec2f(0.0), vec2f(1.0));
    let color = textureSampleLevel(inputTexture, texSampler, sampleUV, 0.0).rgb;
    sumColor = sumColor + color;
    count = count + 1;
  }

  let avgColor = sumColor / f32(count);
  
  var sortedColor = avgColor;
  if (uniforms.reverse > 0.5) {
    sortedColor = vec3f(1.0) - avgColor;
  }

  let finalColor = mix(currentColor, sortedColor, uniforms.intensity);

  return vec4f(applyBrightnessContrast(finalColor, uniforms.brightness * 0.005, uniforms.contrast * 0.01), 1.0);
}
`;

export class PixelSortEffect extends SinglePassEffect<PixelSortOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<PixelSortOptions> = {}) {
    super(device, format, { ...DEFAULT_OPTIONS, ...options });
  }
  
  protected getFragmentShader(): string {
    return FRAGMENT_SHADER;
  }
  
  protected getUniformBufferSize(): number {
    return 48;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(12);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.threshold;
    data[3] = this.options.direction;
    data[4] = this.options.mode;
    data[5] = this.options.streakLength;
    data[6] = this.options.intensity;
    data[7] = this.options.randomness;
    data[8] = this.options.reverse ? 1 : 0;
    data[9] = this.options.brightness;
    data[10] = this.options.contrast;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
