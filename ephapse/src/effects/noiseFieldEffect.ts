/**
 * Noise Field Effect - Flowing noise distortion
 */

import { SinglePassEffect } from './singlePassEffect';

export interface NoiseFieldOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  scale: number;
  intensity: number;
  speed: number;
  time: number;
  octaves: number;
  noiseType: number;
  distortOnly: boolean;
  animate: boolean;
}

const DEFAULT_OPTIONS: NoiseFieldOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  scale: 30,
  intensity: 1.5,
  speed: 1,
  time: 0,
  octaves: 4,
  noiseType: 0,
  distortOnly: false,
  animate: false,
};

const FRAGMENT_SHADER = `
struct NoiseFieldUniforms {
  resolution: vec2f,
  scale: f32,
  intensity: f32,
  speed: f32,
  time: f32,
  octaves: f32,
  animate: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
  noiseType: f32,
  distortOnly: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: NoiseFieldUniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn hash2(p: vec2f) -> vec2f {
  return vec2f(
    fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2f(269.5, 183.3))) * 43758.5453)
  );
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn simplexNoise(p: vec2f) -> f32 {
  let K1 = 0.366025404;
  let K2 = 0.211324865;

  let i = floor(p + (p.x + p.y) * K1);
  let a = p - i + (i.x + i.y) * K2;
  let o = step(a.yx, a.xy);
  let b = a - o + K2;
  let c = a - 1.0 + 2.0 * K2;

  let h = max(0.5 - vec3f(dot(a, a), dot(b, b), dot(c, c)), vec3f(0.0));
  let n = h * h * h * h * vec3f(dot(a, hash2(i) - 0.5), dot(b, hash2(i + o) - 0.5), dot(c, hash2(i + 1.0) - 0.5));

  return dot(n, vec3f(70.0));
}

fn worleyNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);

  var minDist = 1.0;
  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let neighbor = vec2f(f32(x), f32(y));
      let point = hash2(i + neighbor);
      let diff = neighbor + point - f;
      let dist = length(diff);
      minDist = min(minDist, dist);
    }
  }

  return minDist;
}

fn getNoise(p: vec2f, noiseType: f32) -> f32 {
  let typeInt = i32(noiseType + 0.5);
  if (typeInt == 1) {
    return simplexNoise(p) * 0.5 + 0.5;
  } else if (typeInt == 2) {
    return worleyNoise(p);
  } else {
    return noise(p);
  }
}

fn fbm(p: vec2f, octaves: i32, noiseType: f32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i = i + 1) {
    value = value + amplitude * getNoise(pos, noiseType);
    pos = pos * 2.0;
    amplitude = amplitude * 0.5;
  }

  return value;
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
  let noiseScale = uniforms.scale;

  var animatedTime = 0.0;
  if (uniforms.animate > 0.5) {
    animatedTime = uniforms.time * uniforms.speed;
  }

  let octaves = i32(uniforms.octaves + 0.5);

  let noisePos = texCoord * noiseScale + vec2f(animatedTime * 0.1);
  let noiseVal = fbm(noisePos, octaves, uniforms.noiseType);
  let noiseVal2 = fbm(noisePos + vec2f(100.0, 100.0), octaves, uniforms.noiseType);

  let displacement = (vec2f(noiseVal, noiseVal2) - 0.5) * 2.0 * uniforms.intensity * 0.02;
  let displacedUV = texCoord + displacement;

  var color = textureSample(inputTexture, texSampler, clamp(displacedUV, vec2f(0.0), vec2f(1.0))).rgb;
  color = applyImageProcessing(color);

  if (uniforms.distortOnly < 0.5) {
    let overlayNoise = fbm(texCoord * noiseScale * 2.0 + animatedTime, octaves, uniforms.noiseType) * 0.1;
    color = color + vec3f(overlayNoise * uniforms.intensity * 0.3);
  }

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

export class NoiseFieldEffect extends SinglePassEffect<NoiseFieldOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<NoiseFieldOptions> = {}) {
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
    data[2] = this.options.scale;
    data[3] = this.options.intensity;
    data[4] = this.options.speed;
    data[5] = this.options.time;
    data[6] = this.options.octaves;
    data[7] = this.options.animate ? 1 : 0;
    data[8] = this.options.brightness * 0.005;
    data[9] = this.options.contrast * 0.01;
    data[10] = Math.max(0.1, this.options.gamma);
    data[11] = this.options.saturation * 0.01;
    data[12] = this.options.hue / 360.0;
    data[13] = this.options.noiseType;
    data[14] = this.options.distortOnly ? 1 : 0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
