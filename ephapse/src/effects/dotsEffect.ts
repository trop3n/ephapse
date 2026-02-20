/**
 * Dots Effect - Geometric dot patterns
 */

import { SinglePassEffect } from './singlePassEffect';

export interface DotsOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  sizeMultiplier: number;
  spacing: number;
  shape: number;
  gridType: number;
  invert: boolean;
  colorMode: number;
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
}

const DEFAULT_OPTIONS: DotsOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  sizeMultiplier: 1,
  spacing: 1,
  shape: 0,
  gridType: 0,
  invert: false,
  colorMode: 0,
  foregroundColor: [0, 0, 0],
  backgroundColor: [1, 1, 1],
};

const FRAGMENT_SHADER = `
struct DotsUniforms {
  resolution: vec2f,
  sizeMultiplier: f32,
  spacing: f32,
  shape: f32,
  gridType: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
  bgColorR: f32,
  bgColorG: f32,
  bgColorB: f32,
  colorMode: f32,
  fgColorR: f32,
  fgColorG: f32,
  fgColorB: f32,
  invert: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: DotsUniforms;

const LUMA_R: f32 = 0.299;
const LUMA_G: f32 = 0.587;
const LUMA_B: f32 = 0.114;
const HEX_RATIO: f32 = 0.866;

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

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let baseSpacing = 8.0 * uniforms.spacing;
  let invBaseSpacing = 1.0 / baseSpacing;
  let dotRadius = baseSpacing * 0.4 * uniforms.sizeMultiplier;
  let invResolution = 1.0 / uniforms.resolution;

  let isHexGrid = uniforms.gridType > 0.5;
  let doInvert = uniforms.invert > 0.5;
  let shapeInt = i32(uniforms.shape + 0.5);
  let colorModeInt = i32(uniforms.colorMode + 0.5);

  let pixelPos = texCoord * uniforms.resolution;

  var cellCenter: vec2f;

  if (isHexGrid) {
    let hexSpacingY = baseSpacing * HEX_RATIO;
    let invHexSpacingY = 1.0 / hexSpacingY;
    let row = floor(pixelPos.y * invHexSpacingY);
    let isOddRow = (i32(row) & 1) == 1;
    let xOffset = select(0.0, baseSpacing * 0.5, isOddRow);
    let cellX = floor((pixelPos.x - xOffset) * invBaseSpacing);
    cellCenter = vec2f(
      (cellX + 0.5) * baseSpacing + xOffset,
      (row + 0.5) * hexSpacingY
    );
  } else {
    let cellPos = floor(pixelPos * invBaseSpacing);
    cellCenter = (cellPos + 0.5) * baseSpacing;
  }

  let cellUV = cellCenter * invResolution;

  var color = textureSample(inputTexture, texSampler, cellUV).rgb;
  color = applyImageProcessing(color);

  var luma = luminance(color);
  luma = select(luma, 1.0 - luma, doInvert);

  let localPos = pixelPos - cellCenter;
  let absLocalX = abs(localPos.x);
  let absLocalY = abs(localPos.y);

  let radius = dotRadius * (0.2 + luma * 0.8);
  let radiusSq = radius * radius;

  let distSq = localPos.x * localPos.x + localPos.y * localPos.y;
  let circleCheck = distSq < radiusSq;
  let squareCheck = max(absLocalX, absLocalY) < radius;
  let diamondCheck = (absLocalX + absLocalY) < radius * 1.4;

  let inShape = select(
    select(circleCheck, squareCheck, shapeInt == 1),
    diamondCheck,
    shapeInt == 2
  );

  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);

  let grayscaleColor = vec3f(luma);
  let customColor = fgColor * luma;

  let dotColor = select(
    select(color, grayscaleColor, colorModeInt == 1),
    customColor,
    colorModeInt == 2
  );

  let finalColor = select(bgColor, dotColor, inShape);

  return vec4f(finalColor, 1.0);
}
`;

export class DotsEffect extends SinglePassEffect<DotsOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<DotsOptions> = {}) {
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
    data[2] = this.options.sizeMultiplier;
    data[3] = this.options.spacing;
    data[4] = this.options.shape;
    data[5] = this.options.gridType;
    data[6] = this.options.brightness * 0.005;
    data[7] = this.options.contrast * 0.01;
    data[8] = Math.max(0.1, this.options.gamma);
    data[9] = this.options.saturation * 0.01;
    data[10] = this.options.hue / 360.0;
    data[11] = this.options.backgroundColor[0];
    data[12] = this.options.backgroundColor[1];
    data[13] = this.options.backgroundColor[2];
    data[14] = this.options.colorMode;
    data[15] = this.options.foregroundColor[0];
    data[16] = this.options.foregroundColor[1];
    data[17] = this.options.foregroundColor[2];
    data[18] = this.options.invert ? 1 : 0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
