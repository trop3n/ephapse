import { SinglePassEffect } from './singlePassEffect';

export interface DitheringOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  sharpness: number;
  blur: number;
  method: number;
  colorLevels: number;
  matrixSize: number;
  intensity: number;
  modulation: boolean;
  chromaticEnabled: boolean;
  chromaticMaxDisplace: number;
  chromaticRedAngle: number;
  chromaticGreenAngle: number;
  chromaticBlueAngle: number;
  colorMode: number;
  useOriginalColors: boolean;
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
}

const DEFAULT_OPTIONS: DitheringOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  sharpness: 0,
  blur: 0,
  method: 0,
  colorLevels: 2,
  matrixSize: 4,
  intensity: 1.0,
  modulation: false,
  chromaticEnabled: false,
  chromaticMaxDisplace: 6,
  chromaticRedAngle: 23,
  chromaticGreenAngle: 50,
  chromaticBlueAngle: 80,
  colorMode: 0,
  useOriginalColors: true,
  foregroundColor: [1, 1, 1],
  backgroundColor: [0, 0, 0],
};

const FRAGMENT_SHADER = `
struct DitheringUniforms {
  resolution: vec2f,
  method: f32,
  colorLevels: f32,
  matrixSize: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
  sharpness: f32,
  blur: f32,
  colorMode: f32,
  useOriginalColors: f32,
  intensity: f32,
  modulation: f32,
  foregroundAndChromatic: vec4f,
  backgroundAndDisplace: vec4f,
  chromaticRedAngle: f32,
  chromaticGreenAngle: f32,
  chromaticBlueAngle: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: DitheringUniforms;

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
  
  let colorModeInt = i32(uniforms.colorMode + 0.5);
  if (colorModeInt == 1) {
    result = vec3f(luminance(result));
  } else if (colorModeInt == 2) {
    let grayVal = luminance(result);
    result = mix(uniforms.backgroundAndDisplace.xyz, uniforms.foregroundAndChromatic.xyz, grayVal);
  } else if (colorModeInt == 3) {
    let grayVal = luminance(result);
    result = vec3f(grayVal * 1.2, grayVal, grayVal * 0.8);
  }
  
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn bayer2x2(p: vec2f) -> f32 {
  let x = i32(p.x) & 1;
  let y = i32(p.y) & 1;
  let m = array<f32, 4>(0.0, 2.0, 3.0, 1.0);
  return m[y * 2 + x] / 4.0;
}

fn bayer4x4(p: vec2f) -> f32 {
  let x = i32(p.x) & 3;
  let y = i32(p.y) & 3;
  let m = array<f32, 16>(
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
  );
  return m[y * 4 + x] / 16.0;
}

fn bayer8x8(p: vec2f) -> f32 {
  let x = i32(p.x) & 7;
  let y = i32(p.y) & 7;
  let m = array<f32, 64>(
    0.0, 48.0, 12.0, 60.0, 3.0, 51.0, 15.0, 63.0,
    32.0, 16.0, 44.0, 28.0, 35.0, 19.0, 47.0, 31.0,
    8.0, 56.0, 4.0, 52.0, 11.0, 59.0, 7.0, 55.0,
    40.0, 24.0, 36.0, 20.0, 43.0, 27.0, 39.0, 23.0,
    2.0, 50.0, 14.0, 62.0, 1.0, 49.0, 13.0, 61.0,
    34.0, 18.0, 46.0, 30.0, 33.0, 17.0, 45.0, 29.0,
    10.0, 58.0, 6.0, 54.0, 9.0, 57.0, 5.0, 53.0,
    42.0, 26.0, 38.0, 22.0, 41.0, 25.0, 37.0, 21.0
  );
  return m[y * 8 + x] / 64.0;
}

fn getBayer(p: vec2f, size: f32) -> f32 {
  let sizeInt = i32(size + 0.5);
  if (sizeInt <= 2) {
    return bayer2x2(p);
  } else if (sizeInt <= 4) {
    return bayer4x4(p);
  } else {
    return bayer8x8(p);
  }
}

fn bayer16x16(p: vec2f) -> f32 {
  let x = i32(p.x) & 15;
  let y = i32(p.y) & 15;
  let b8 = i32(bayer8x8(vec2f(f32(x & 7), f32(y & 7))) * 64.0 + 0.5);
  let b2 = i32(bayer2x2(vec2f(f32(x >> 3), f32(y >> 3))) * 4.0 + 0.5);
  return f32(4 * b8 + b2) / 256.0;
}

fn clusteredDot(p: vec2f) -> f32 {
  let x = f32(((i32(p.x) % 6) + 6) % 6);
  let y = f32(((i32(p.y) % 6) + 6) % 6);
  let dx = x - 2.5;
  let dy = y - 2.5;
  return clamp(sqrt(dx * dx + dy * dy) / 3.536, 0.0, 1.0);
}

fn interleavedGradientNoise(p: vec2f) -> f32 {
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

fn blueNoise(p: vec2f) -> f32 {
  return fract(interleavedGradientNoise(p) + 0.61803398875);
}

fn crosshatch(p: vec2f) -> f32 {
  let x = i32(p.x) & 7;
  let y = i32(p.y) & 7;
  let d1 = f32((x + y) & 7) / 8.0;
  let d2 = f32((x - y + 8) & 7) / 8.0;
  return min(d1, d2);
}

fn quantizeChannel(value: f32, levels: f32) -> f32 {
  let steps = levels - 1.0;
  return floor(value * steps + 0.5) / steps;
}

fn getDitherThreshold(pixelCoord: vec2f, lum: f32) -> f32 {
  let methodInt = i32(uniforms.method + 0.5);
  var pattern: f32;

  if (methodInt == 0 || methodInt == 1 || methodInt == 2) {
    pattern = getBayer(pixelCoord, uniforms.matrixSize);
  } else if (methodInt == 3) {
    return 0.0;
  } else if (methodInt == 4) {
    pattern = bayer16x16(pixelCoord);
  } else if (methodInt == 5) {
    pattern = clusteredDot(pixelCoord);
  } else if (methodInt == 6) {
    pattern = interleavedGradientNoise(pixelCoord);
  } else if (methodInt == 7) {
    pattern = blueNoise(pixelCoord);
  } else {
    pattern = crosshatch(pixelCoord);
  }

  var threshold = (pattern - 0.5) * uniforms.intensity;
  if (uniforms.modulation > 0.5) {
    threshold *= lum * 2.0;
  }
  return threshold;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelCoord = texCoord * uniforms.resolution;
  let levels = max(uniforms.colorLevels, 2.0);

  if (uniforms.foregroundAndChromatic.w > 0.5) {
    let maxD = uniforms.backgroundAndDisplace.w;
    let rOff = vec2f(cos(uniforms.chromaticRedAngle),   sin(uniforms.chromaticRedAngle))   * maxD / uniforms.resolution;
    let gOff = vec2f(cos(uniforms.chromaticGreenAngle), sin(uniforms.chromaticGreenAngle)) * maxD / uniforms.resolution;
    let bOff = vec2f(cos(uniforms.chromaticBlueAngle),  sin(uniforms.chromaticBlueAngle))  * maxD / uniforms.resolution;

    let rColor = applyImageProcessing(textureSample(inputTexture, texSampler, texCoord + rOff).rgb);
    let gColor = applyImageProcessing(textureSample(inputTexture, texSampler, texCoord + gOff).rgb);
    let bColor = applyImageProcessing(textureSample(inputTexture, texSampler, texCoord + bOff).rgb);

    let threshold = getDitherThreshold(pixelCoord, luminance(rColor));
    let r = quantizeChannel(rColor.r + threshold / (levels - 1.0), levels);
    let g = quantizeChannel(gColor.g + threshold / (levels - 1.0), levels);
    let b = quantizeChannel(bColor.b + threshold / (levels - 1.0), levels);
    return vec4f(r, g, b, 1.0);
  }

  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyImageProcessing(color);
  let threshold = getDitherThreshold(pixelCoord, luminance(color));
  let r = quantizeChannel(color.r + threshold / (levels - 1.0), levels);
  let g = quantizeChannel(color.g + threshold / (levels - 1.0), levels);
  let b = quantizeChannel(color.b + threshold / (levels - 1.0), levels);
  return vec4f(r, g, b, 1.0);
}
`;

export class DitheringEffect extends SinglePassEffect<DitheringOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<DitheringOptions> = {}) {
    super(device, format, { ...DEFAULT_OPTIONS, ...options });
  }
  
  protected getFragmentShader(): string {
    return FRAGMENT_SHADER;
  }
  
  protected getUniformBufferSize(): number {
    return 112;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(28);
    data[0]  = this.options.resolution[0];
    data[1]  = this.options.resolution[1];
    data[2]  = this.options.method;
    data[3]  = this.options.colorLevels;
    data[4]  = this.options.matrixSize;
    data[5]  = this.options.brightness * 0.005;
    data[6]  = this.options.contrast * 0.01;
    data[7]  = Math.max(0.1, this.options.gamma);
    data[8]  = this.options.saturation * 0.01;
    data[9]  = this.options.hue / 360.0;
    data[10] = this.options.sharpness;
    data[11] = this.options.blur;
    data[12] = this.options.colorMode;
    data[13] = this.options.useOriginalColors ? 1.0 : 0.0;
    data[14] = this.options.intensity;                          // fills former padding
    data[15] = this.options.modulation ? 1.0 : 0.0;            // fills former padding
    // foregroundColor at offset 64 (index 16) — alignment preserved
    data[16] = this.options.foregroundColor[0];
    data[17] = this.options.foregroundColor[1];
    data[18] = this.options.foregroundColor[2];
    data[19] = this.options.chromaticEnabled ? 1.0 : 0.0;      // fills former vec3 padding
    // backgroundColor at offset 80 (index 20) — alignment preserved
    data[20] = this.options.backgroundColor[0];
    data[21] = this.options.backgroundColor[1];
    data[22] = this.options.backgroundColor[2];
    data[23] = this.options.chromaticMaxDisplace;               // fills former vec3 padding
    // angles stored as radians
    data[24] = this.options.chromaticRedAngle   * Math.PI / 180.0;
    data[25] = this.options.chromaticGreenAngle * Math.PI / 180.0;
    data[26] = this.options.chromaticBlueAngle  * Math.PI / 180.0;
    // data[27] = implicit padding, left as 0
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
