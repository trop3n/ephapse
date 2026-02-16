/**
 * Edge Detection Effect - Sobel/Prewitt/Laplacian edge detection
 */

import { SinglePassEffect } from './singlePassEffect';

export interface EdgeDetectionOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  threshold: number;
  lineWidth: number;
  algorithm: number;
  invert: boolean;
  colorMode: boolean;
  edgeColor: [number, number, number];
  bgColor: [number, number, number];
}

const DEFAULT_OPTIONS: EdgeDetectionOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  threshold: 0.15,
  lineWidth: 1,
  algorithm: 0,
  invert: false,
  colorMode: false,
  edgeColor: [1, 1, 1],
  bgColor: [0, 0, 0],
};

const FRAGMENT_SHADER = `
struct EdgeUniforms {
  resolution: vec2f,
  threshold: f32,
  lineWidth: f32,
  invert: f32,
  algorithm: f32,
  brightness: f32,
  contrast: f32,
  edgeColorR: f32,
  edgeColorG: f32,
  edgeColorB: f32,
  bgColorR: f32,
  bgColorG: f32,
  bgColorB: f32,
  colorMode: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: EdgeUniforms;

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

fn sampleLuminance(uv: vec2f, brightnessOffset: f32, contrastFactor: f32) -> f32 {
  let color = textureSample(inputTexture, texSampler, uv).rgb;
  return luminance(applyBrightnessContrast(color, brightnessOffset, contrastFactor));
}

const GAUSS_CORNER: f32 = 0.0625;
const GAUSS_EDGE: f32 = 0.125;
const GAUSS_CENTER: f32 = 0.25;

fn gaussianBlurLuminance(uv: vec2f, pixelSize: vec2f, brightnessOffset: f32, contrastFactor: f32) -> f32 {
  let nps = -pixelSize;
  let pps = pixelSize;

  return sampleLuminance(uv + vec2f(nps.x, nps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER +
         sampleLuminance(uv + vec2f(0.0, nps.y), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv + vec2f(pps.x, nps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER +
         sampleLuminance(uv + vec2f(nps.x, 0.0), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv, brightnessOffset, contrastFactor) * GAUSS_CENTER +
         sampleLuminance(uv + vec2f(pps.x, 0.0), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv + vec2f(nps.x, pps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER +
         sampleLuminance(uv + vec2f(0.0, pps.y), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv + vec2f(pps.x, pps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let contrastFactor = (1.0 + uniforms.contrast * 0.01) / (1.0 - uniforms.contrast * 0.0099);
  let brightnessOffset = uniforms.brightness * 0.005;
  let pixelSize = vec2f(uniforms.lineWidth) / uniforms.resolution;
  let algoInt = i32(uniforms.algorithm + 0.5);
  let doInvert = uniforms.invert > 0.5;
  let useOriginalColor = uniforms.colorMode > 0.5;

  let originalColor = textureSample(inputTexture, texSampler, texCoord).rgb;

  let nps = -pixelSize;
  let pps = pixelSize;

  let tl = gaussianBlurLuminance(texCoord + vec2f(nps.x, nps.y), pixelSize, brightnessOffset, contrastFactor);
  let tc = gaussianBlurLuminance(texCoord + vec2f(0.0, nps.y), pixelSize, brightnessOffset, contrastFactor);
  let tr = gaussianBlurLuminance(texCoord + vec2f(pps.x, nps.y), pixelSize, brightnessOffset, contrastFactor);
  let ml = gaussianBlurLuminance(texCoord + vec2f(nps.x, 0.0), pixelSize, brightnessOffset, contrastFactor);
  let mr = gaussianBlurLuminance(texCoord + vec2f(pps.x, 0.0), pixelSize, brightnessOffset, contrastFactor);
  let bl = gaussianBlurLuminance(texCoord + vec2f(nps.x, pps.y), pixelSize, brightnessOffset, contrastFactor);
  let bc = gaussianBlurLuminance(texCoord + vec2f(0.0, pps.y), pixelSize, brightnessOffset, contrastFactor);
  let br = gaussianBlurLuminance(texCoord + vec2f(pps.x, pps.y), pixelSize, brightnessOffset, contrastFactor);

  var edge: f32;

  if (algoInt == 1) {
    let gx = -tl - ml - bl + tr + mr + br;
    let gy = -tl - tc - tr + bl + bc + br;
    edge = sqrt(gx * gx + gy * gy);
  } else if (algoInt == 2) {
    let mc = gaussianBlurLuminance(texCoord, pixelSize, brightnessOffset, contrastFactor);
    let center = mc * 8.0;
    let neighbors = tl + tc + tr + ml + mr + bl + bc + br;
    edge = abs(center - neighbors);
  } else {
    let gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    let gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    edge = sqrt(gx * gx + gy * gy);
  }

  let edgeSoftness = uniforms.threshold * 0.3;
  let edgeIntensity = smoothstep(uniforms.threshold - edgeSoftness, uniforms.threshold + edgeSoftness, edge);

  let finalIntensity = select(edgeIntensity, 1.0 - edgeIntensity, doInvert);

  let edgeColor = vec3f(uniforms.edgeColorR, uniforms.edgeColorG, uniforms.edgeColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  let processedOriginal = applyBrightnessContrast(originalColor, brightnessOffset, contrastFactor);
  let originalColorResult = mix(bgColor, processedOriginal, finalIntensity);
  let customColorResult = mix(bgColor, edgeColor, finalIntensity);
  let finalColor = select(customColorResult, originalColorResult, useOriginalColor);

  return vec4f(finalColor, 1.0);
}
`;

export class EdgeDetectionEffect extends SinglePassEffect<EdgeDetectionOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<EdgeDetectionOptions> = {}) {
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
    data[2] = this.options.threshold;
    data[3] = this.options.lineWidth;
    data[4] = this.options.invert ? 1 : 0;
    data[5] = this.options.algorithm;
    data[6] = this.options.brightness;
    data[7] = this.options.contrast;
    data[8] = this.options.edgeColor[0];
    data[9] = this.options.edgeColor[1];
    data[10] = this.options.edgeColor[2];
    data[11] = this.options.bgColor[0];
    data[12] = this.options.bgColor[1];
    data[13] = this.options.bgColor[2];
    data[14] = this.options.colorMode ? 1 : 0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
