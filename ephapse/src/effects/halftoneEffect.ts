/**
 * Halftone Effect - Newspaper-style dot patterns
 */

import { SinglePassEffect } from './singlePassEffect';

export interface HalftoneOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  dotScale: number;
  spacing: number;
  angle: number;
  shape: number;
  invert: boolean;
  colorMode: number;
  useOriginalColors: boolean;
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
}

const DEFAULT_OPTIONS: HalftoneOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  dotScale: 1,
  spacing: 8,
  angle: 45,
  shape: 0,
  invert: false,
  colorMode: 0,
  useOriginalColors: true,
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
  gamma: f32,
  saturation: f32,
  hue: f32,
  useOriginalColors: f32,
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

fn applyColorMode(color: vec3f) -> vec3f {
  var result = color;
  let colorModeInt = i32(uniforms.colorMode + 0.5);
  
  if (colorModeInt == 1) {
    result = vec3f(luminance(result));
  } else if (colorModeInt == 2) {
    let grayVal = luminance(result);
    let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
    let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);
    result = mix(bgColor, fgColor, grayVal);
  } else if (colorModeInt == 3) {
    let grayVal = luminance(result);
    result = vec3f(grayVal * 1.2, grayVal, grayVal * 0.8);
  }
  
  return clamp(result, vec3f(0.0), vec3f(1.0));
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
  let frequency = 1.0 / uniforms.spacing;
  let shapeInt = i32(uniforms.shape + 0.5);
  let doInvert = uniforms.invert > 0.5;
  let colorModeInt = i32(uniforms.colorMode + 0.5);

  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyImageProcessing(color);
  
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);

  var lum = luminance(color);
  lum = select(lum, 1.0 - lum, doInvert);

  let angleRad = uniforms.angle * PI / 180.0;
  let pattern = halftonePattern(texCoord * uniforms.resolution, frequency, angleRad, lum, shapeInt);

  var finalColor: vec3f;
  if (colorModeInt == 0) {
    let processedColor = applyColorMode(color);
    finalColor = mix(processedColor, bgColor, pattern);
  } else if (colorModeInt == 1) {
    finalColor = mix(vec3f(1.0), vec3f(0.0), pattern);
    finalColor = mix(bgColor, fgColor, luminance(finalColor));
  } else if (colorModeInt == 2) {
    finalColor = mix(bgColor, fgColor, 1.0 - pattern);
  } else {
    let grayVal = 1.0 - pattern;
    finalColor = vec3f(grayVal * 1.2, grayVal, grayVal * 0.8);
  }

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
    return 96;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(24);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.dotScale;
    data[3] = this.options.angle;
    data[4] = this.options.shape;
    data[5] = this.options.spacing;
    data[6] = this.options.invert ? 1 : 0;
    data[7] = this.options.colorMode;
    data[8] = this.options.backgroundColor[0];
    data[9] = this.options.backgroundColor[1];
    data[10] = this.options.backgroundColor[2];
    data[11] = this.options.foregroundColor[0];
    data[12] = this.options.foregroundColor[1];
    data[13] = this.options.foregroundColor[2];
    data[14] = this.options.brightness * 0.005;
    data[15] = this.options.contrast * 0.01;
    data[16] = Math.max(0.1, this.options.gamma);
    data[17] = this.options.saturation * 0.01;
    data[18] = this.options.hue / 360.0;
    data[19] = this.options.useOriginalColors ? 1.0 : 0.0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
