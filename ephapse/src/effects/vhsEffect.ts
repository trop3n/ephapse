/**
 * VHS Effect - Retro tape distortion
 */

import { SinglePassEffect } from './singlePassEffect';

export interface VhsOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  time: number;
  distortion: number;
  noise: number;
  colorBleed: number;
  scanlines: number;
  trackingError: number;
}

const DEFAULT_OPTIONS: VhsOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  time: 0,
  distortion: 0.5,
  noise: 0.3,
  colorBleed: 0.5,
  scanlines: 0.5,
  trackingError: 0.3,
};

const FRAGMENT_SHADER = `
struct VhsUniforms {
  resolution: vec2f,
  time: f32,
  distortion: f32,
  noise: f32,
  colorBleed: f32,
  scanlines: f32,
  trackingError: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: VhsUniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

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
  var uv = texCoord;
  let time = uniforms.time;

  if (uniforms.trackingError > 0.01) {
    let trackNoise = noise(vec2f(floor(uv.y * 20.0), floor(time * 2.0)));
    let trackOffset = (trackNoise - 0.5) * 0.1 * uniforms.trackingError;

    let jumpNoise = noise(vec2f(time * 0.5, 0.0));
    let bigJump = step(0.92, jumpNoise) * (noise(vec2f(uv.y * 5.0, time)) - 0.5) * 0.3;

    uv.x = uv.x + trackOffset + bigJump * uniforms.trackingError;
  }

  if (uniforms.distortion > 0.01) {
    let warpFreq = 3.0 + noise(vec2f(time * 0.1, 0.0)) * 5.0;
    let warpAmp = uniforms.distortion * 0.02;

    uv.x = uv.x + sin(uv.y * warpFreq * 6.28 + time * 2.0) * warpAmp;

    let shake = noise(vec2f(time * 10.0, 0.0)) - 0.5;
    uv.x = uv.x + shake * uniforms.distortion * 0.01;

    let edgeDist = abs(uv.y - 0.5) * 2.0;
    let edgeWarp = pow(edgeDist, 3.0) * uniforms.distortion * 0.1;
    uv.x = uv.x + sin(time * 3.0 + uv.y * 10.0) * edgeWarp;
  }

  uv = clamp(uv, vec2f(0.0), vec2f(1.0));

  var color: vec3f;
  if (uniforms.colorBleed > 0.01) {
    let bleedAmount = uniforms.colorBleed * 0.01;

    let r = textureSampleLevel(inputTexture, texSampler, uv + vec2f(bleedAmount * 2.0, 0.0), 0.0).r;
    let g = textureSampleLevel(inputTexture, texSampler, uv, 0.0).g;
    let b = textureSampleLevel(inputTexture, texSampler, uv - vec2f(bleedAmount * 2.0, 0.0), 0.0).b;

    var chromaBlur = vec3f(0.0);
    for (var i = -2; i <= 2; i = i + 1) {
      let offset = f32(i) * bleedAmount;
      chromaBlur = chromaBlur + textureSampleLevel(inputTexture, texSampler, uv + vec2f(offset, 0.0), 0.0).rgb;
    }
    chromaBlur = chromaBlur / 5.0;

    color = vec3f(r, g, b);
    color = mix(color, chromaBlur, 0.3);
  } else {
    color = textureSampleLevel(inputTexture, texSampler, uv, 0.0).rgb;
  }

  if (uniforms.scanlines > 0.01) {
    let scanline = sin(uv.y * uniforms.resolution.y * 3.14159) * 0.5 + 0.5;
    let scanlineIntensity = mix(1.0, scanline, uniforms.scanlines * 0.5);
    color = color * scanlineIntensity;
  }

  if (uniforms.noise > 0.01) {
    let grain = hash(uv * uniforms.resolution + vec2f(time * 1000.0)) - 0.5;
    color = color + vec3f(grain * uniforms.noise * 0.3);
  }

  color.r = color.r * 1.1;
  color.b = color.b * 0.9;

  let vignette = 1.0 - length((uv - 0.5) * vec2f(0.5, 0.7)) * 0.5;
  color = color * vignette;

  color = applyImageProcessing(color);
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

export class VhsEffect extends SinglePassEffect<VhsOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<VhsOptions> = {}) {
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
    data[2] = this.options.time;
    data[3] = this.options.distortion;
    data[4] = this.options.noise;
    data[5] = this.options.colorBleed;
    data[6] = this.options.scanlines;
    data[7] = this.options.trackingError;
    data[8] = this.options.brightness * 0.005;
    data[9] = this.options.contrast * 0.01;
    data[10] = Math.max(0.1, this.options.gamma);
    data[11] = this.options.saturation * 0.01;
    data[12] = this.options.hue / 360.0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
