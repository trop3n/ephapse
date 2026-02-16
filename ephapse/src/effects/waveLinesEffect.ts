/**
 * Wave Lines Effect - Sine wave distortion with lines
 */

import { SinglePassEffect } from './singlePassEffect';

export interface WaveLinesOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  lineCount: number;
  amplitude: number;
  frequency: number;
  time: number;
  direction: number;
  lineThickness: number;
  colorMode: number;
  animate: boolean;
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
}

const DEFAULT_OPTIONS: WaveLinesOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  lineCount: 50,
  amplitude: 15,
  frequency: 1.5,
  time: 0,
  direction: 0,
  lineThickness: 0.5,
  colorMode: 0,
  animate: false,
  foregroundColor: [0, 0, 0],
  backgroundColor: [1, 1, 1],
};

const FRAGMENT_SHADER = `
struct WaveLinesUniforms {
  resolution: vec2f,
  lineCount: f32,
  amplitude: f32,
  frequency: f32,
  time: f32,
  direction: f32,
  lineThickness: f32,
  brightness: f32,
  contrast: f32,
  colorMode: f32,
  fgColorR: f32,
  fgColorG: f32,
  fgColorB: f32,
  bgColorR: f32,
  bgColorG: f32,
  bgColorB: f32,
  animate: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: WaveLinesUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + brightness;
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness * 0.005, uniforms.contrast * 0.01);

  let brightness = luminance(color);
  let pixelPos = texCoord * uniforms.resolution;

  var animTime = 0.0;
  if (uniforms.animate > 0.5) {
    animTime = uniforms.time;
  }

  var distFromLine: f32;
  var lineThickness: f32;

  if (uniforms.direction < 0.5) {
    let lineSpacing = uniforms.resolution.y / uniforms.lineCount;
    let lineIndex = floor(pixelPos.y / lineSpacing);
    let wavePhase = (pixelPos.x / uniforms.resolution.x) * 6.28318 * uniforms.frequency;
    let waveOffset = sin(wavePhase + animTime) * uniforms.amplitude * brightness;
    let lineY = (lineIndex + 0.5) * lineSpacing + waveOffset;
    distFromLine = abs(pixelPos.y - lineY);
    lineThickness = lineSpacing * uniforms.lineThickness * (0.3 + brightness * 0.7);
  } else {
    let lineSpacing = uniforms.resolution.x / uniforms.lineCount;
    let lineIndex = floor(pixelPos.x / lineSpacing);
    let wavePhase = (pixelPos.y / uniforms.resolution.y) * 6.28318 * uniforms.frequency;
    let waveOffset = sin(wavePhase + animTime) * uniforms.amplitude * brightness;
    let lineX = (lineIndex + 0.5) * lineSpacing + waveOffset;
    distFromLine = abs(pixelPos.x - lineX);
    lineThickness = lineSpacing * uniforms.lineThickness * (0.3 + brightness * 0.7);
  }

  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);

  if (distFromLine < lineThickness) {
    let colorModeInt = i32(uniforms.colorMode + 0.5);
    if (colorModeInt == 1) {
      return vec4f(vec3f(brightness), 1.0);
    } else if (colorModeInt == 2) {
      return vec4f(fgColor, 1.0);
    } else {
      return vec4f(color, 1.0);
    }
  }

  return vec4f(bgColor, 1.0);
}
`;

export class WaveLinesEffect extends SinglePassEffect<WaveLinesOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<WaveLinesOptions> = {}) {
    super(device, format, { ...DEFAULT_OPTIONS, ...options });
  }
  
  protected getFragmentShader(): string {
    return FRAGMENT_SHADER;
  }
  
  protected getUniformBufferSize(): number {
    return 68;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(17);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.lineCount;
    data[3] = this.options.amplitude;
    data[4] = this.options.frequency;
    data[5] = this.options.time;
    data[6] = this.options.direction;
    data[7] = this.options.lineThickness;
    data[8] = this.options.brightness;
    data[9] = this.options.contrast;
    data[10] = this.options.colorMode;
    data[11] = this.options.foregroundColor[0];
    data[12] = this.options.foregroundColor[1];
    data[13] = this.options.foregroundColor[2];
    data[14] = this.options.backgroundColor[0];
    data[15] = this.options.backgroundColor[1];
    data[16] = this.options.backgroundColor[2];
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
