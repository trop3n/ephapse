/**
 * Threshold Effect - Posterization and threshold effects
 */

import { SinglePassEffect } from './singlePassEffect';

export interface ThresholdOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  levels: number;
  dither: boolean;
  thresholdPoint: number;
  invert: boolean;
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
  preserveColors: boolean;
}

const DEFAULT_OPTIONS: ThresholdOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  levels: 2,
  dither: false,
  thresholdPoint: 0.5,
  invert: false,
  foregroundColor: [1, 1, 1],
  backgroundColor: [0, 0, 0],
  preserveColors: false,
};

const FRAGMENT_SHADER = `
struct ThresholdUniforms {
  resolution: vec2f,
  levels: f32,
  dither: f32,
  thresholdPoint: f32,
  brightness: f32,
  contrast: f32,
  invert: f32,
  fgColorR: f32,
  fgColorG: f32,
  fgColorB: f32,
  bgColorR: f32,
  bgColorG: f32,
  bgColorB: f32,
  preserveColors: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ThresholdUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + brightness * 0.005;
  let contrastFactor = (1.0 + contrast * 0.01) / (1.0 - contrast * 0.0099);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn bayer4(p: vec2u) -> f32 {
  let m = array<f32, 16>(
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
  );
  return m[p.x + p.y * 4u] / 16.0;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  let pixelPos = vec2u(texCoord * uniforms.resolution);

  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  var adjusted = color;

  if (uniforms.dither > 0.5) {
    let ditherVal = (bayer4(pixelPos % 4u) - 0.5) * 0.1;
    adjusted = adjusted + vec3f(ditherVal);
  }

  let levels = max(uniforms.levels, 2.0);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  if (levels <= 2.0) {
    let brightness = luminance(adjusted);
    var isLight = brightness > uniforms.thresholdPoint;

    if (uniforms.invert > 0.5) {
      isLight = !isLight;
    }

    if (uniforms.preserveColors > 0.5) {
      if (isLight) {
        return vec4f(color, 1.0);
      } else {
        return vec4f(vec3f(0.0), 1.0);
      }
    } else {
      if (isLight) {
        return vec4f(fgColor, 1.0);
      } else {
        return vec4f(bgColor, 1.0);
      }
    }
  } else {
    var posterized = floor(adjusted * (levels - 1.0) + 0.5) / (levels - 1.0);

    if (uniforms.invert > 0.5) {
      posterized = vec3f(1.0) - posterized;
    }

    if (uniforms.preserveColors > 0.5) {
      return vec4f(clamp(posterized, vec3f(0.0), vec3f(1.0)), 1.0);
    } else {
      let brightness = luminance(posterized);
      let tintedColor = mix(bgColor, fgColor, brightness);
      return vec4f(tintedColor, 1.0);
    }
  }
}
`;

export class ThresholdEffect extends SinglePassEffect<ThresholdOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<ThresholdOptions> = {}) {
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
    data[2] = this.options.levels;
    data[3] = this.options.dither ? 1 : 0;
    data[4] = this.options.thresholdPoint;
    data[5] = this.options.brightness;
    data[6] = this.options.contrast;
    data[7] = this.options.invert ? 1 : 0;
    data[8] = this.options.foregroundColor[0];
    data[9] = this.options.foregroundColor[1];
    data[10] = this.options.foregroundColor[2];
    data[11] = this.options.backgroundColor[0];
    data[12] = this.options.backgroundColor[1];
    data[13] = this.options.backgroundColor[2];
    data[14] = this.options.preserveColors ? 1 : 0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
