import { SinglePassEffect } from './singlePassEffect';

export interface DitheringOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  method: number;
  colorLevels: number;
  matrixSize: number;
}

const DEFAULT_OPTIONS: DitheringOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  method: 0,
  colorLevels: 2,
  matrixSize: 4,
};

const FRAGMENT_SHADER = `
struct DitheringUniforms {
  resolution: vec2f,
  method: f32,
  colorLevels: f32,
  matrixSize: f32,
  brightness: f32,
  contrast: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: DitheringUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
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

fn quantizeChannel(value: f32, levels: f32) -> f32 {
  let steps = levels - 1.0;
  return floor(value * steps + 0.5) / steps;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness * 0.005, uniforms.contrast * 0.01);

  let pixelCoord = texCoord * uniforms.resolution;
  let methodInt = i32(uniforms.method + 0.5);

  var result: vec3f;

  if (methodInt == 0 || methodInt == 1 || methodInt == 2) {
    let bayerValue = getBayer(pixelCoord, uniforms.matrixSize);
    let threshold = bayerValue - 0.5;

    let levels = uniforms.colorLevels;
    let r = quantizeChannel(color.r + threshold / (levels - 1.0), levels);
    let g = quantizeChannel(color.g + threshold / (levels - 1.0), levels);
    let b = quantizeChannel(color.b + threshold / (levels - 1.0), levels);
    result = vec3f(r, g, b);
  } else {
    let levels = uniforms.colorLevels;
    result = vec3f(
      quantizeChannel(color.r, levels),
      quantizeChannel(color.g, levels),
      quantizeChannel(color.b, levels)
    );
  }

  return vec4f(result, 1.0);
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
    return 24;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(6);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.method;
    data[3] = this.options.colorLevels;
    data[4] = this.options.matrixSize;
    data[5] = 0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
    
    const bcData = new Float32Array([this.options.brightness * 0.005, this.options.contrast * 0.01]);
    this.device.queue.writeBuffer(this.uniformBuffer, 20, bcData);
  }
}
