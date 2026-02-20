/**
 * Wave Lines Effect - Sine wave distortion with lines
 */

import { SinglePassEffect } from './singlePassEffect';

export interface WaveLinesOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
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
  gamma: 1,
  saturation: 0,
  hue: 0,
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
  gamma: f32,
  saturation: f32,
  hue: f32,
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

fn rgbToHsv(c: vec3f) -> vec3f {
  let maxVal = max(max(c.r, c.g), c.b);
  let minVal = min(min(c.r, c.g), c.b);
  let delta = maxVal - minVal;
  var h = 0.0;
  let s = select(delta / maxVal, 0.0, maxVal == 0.0);
  let v = maxVal;
  if (delta > 0.0) {
    if (maxVal == c.r) {
      h = (c.g - c.b) / delta + select(6.0, 0.0, c.g >= c.b);
    } else if (maxVal == c.g) {
      h = (c.b - c.r) / delta + 2.0;
    } else {
      h = (c.r - c.g) / delta + 4.0;
    }
    h /= 6.0;
  }
  return vec3f(h, s, v);
}

fn hsvToRgb(c: vec3f) -> vec3f {
  let h = c.x * 6.0;
  let s = c.y;
  let v = c.z;
  let i = floor(h);
  let f = h - i;
  let p = v * (1.0 - s);
  let q = v * (1.0 - s * f);
  let t = v * (1.0 - s * (1.0 - f));
  let ii = i32(i) % 6;
  if (ii == 0) { return vec3f(v, t, p); }
  if (ii == 1) { return vec3f(q, v, p); }
  if (ii == 2) { return vec3f(p, v, t); }
  if (ii == 3) { return vec3f(p, q, v); }
  if (ii == 4) { return vec3f(t, p, v); }
  return vec3f(v, p, q);
}

fn applyImageProcessing(color: vec3f) -> vec3f {
  var result = color;
  result = result + vec3f(uniforms.brightness);
  let contrastFactor = (1.0 + uniforms.contrast);
  result = (result - 0.5) * contrastFactor + 0.5;
  result = pow(clamp(result, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / uniforms.gamma));
  let gray = vec3f(luminance(result));
  let satFactor = 1.0 + uniforms.saturation;
  result = mix(gray, result, satFactor);
  if (abs(uniforms.hue) > 0.001) {
    let hsv = rgbToHsv(result);
    let newHue = fract(hsv.x + uniforms.hue + 1.0);
    result = hsvToRgb(vec3f(newHue, hsv.y, hsv.z));
  }
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyImageProcessing(color);

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
    return 80;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(20);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.lineCount;
    data[3] = this.options.amplitude;
    data[4] = this.options.frequency;
    data[5] = this.options.time;
    data[6] = this.options.direction;
    data[7] = this.options.lineThickness;
    data[8] = this.options.brightness * 0.005;
    data[9] = this.options.contrast * 0.01;
    data[10] = Math.max(0.1, this.options.gamma);
    data[11] = this.options.saturation * 0.01;
    data[12] = this.options.hue / 360.0;
    data[13] = this.options.colorMode;
    data[14] = this.options.foregroundColor[0];
    data[15] = this.options.foregroundColor[1];
    data[16] = this.options.foregroundColor[2];
    data[17] = this.options.backgroundColor[0];
    data[18] = this.options.backgroundColor[1];
    data[19] = this.options.backgroundColor[2];
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
