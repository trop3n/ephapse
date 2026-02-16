/**
 * VHS Effect - Retro tape distortion
 */

import { SinglePassEffect } from './singlePassEffect';

export interface VhsOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
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

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + brightness;
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
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

  color = applyBrightnessContrast(color, uniforms.brightness * 0.005, uniforms.contrast * 0.01);
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
    return 40;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(10);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.time;
    data[3] = this.options.distortion;
    data[4] = this.options.noise;
    data[5] = this.options.colorBleed;
    data[6] = this.options.scanlines;
    data[7] = this.options.trackingError;
    data[8] = this.options.brightness;
    data[9] = this.options.contrast;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
