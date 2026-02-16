/**
 * Blockify Effect - Pixelates image into blocks
 */

import { SinglePassEffect } from './singlePassEffect';

export interface BlockifyOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  blockSize: number;
  style: number;
  borderWidth: number;
  borderColor: [number, number, number];
  colorMode: number;
}

const DEFAULT_OPTIONS: BlockifyOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  blockSize: 8,
  style: 0,
  borderWidth: 1,
  borderColor: [0, 0, 0],
  colorMode: 0,
};

const FRAGMENT_SHADER = `
struct BlockifyUniforms {
  resolution: vec2f,
  blockSize: f32,
  style: f32,
  borderWidth: f32,
  brightness: f32,
  contrast: f32,
  borderColorR: f32,
  borderColorG: f32,
  borderColorB: f32,
  colorMode: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: BlockifyUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + brightness * 0.005;
  let contrastFactor = (1.0 + contrast * 0.01) / (1.0 - contrast * 0.0099);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelPos = texCoord * uniforms.resolution;
  let blockPos = floor(pixelPos / uniforms.blockSize);
  let blockCenter = (blockPos + 0.5) * uniforms.blockSize;
  let blockUV = blockCenter / uniforms.resolution;

  var color = textureSample(inputTexture, texSampler, blockUV).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  if (uniforms.colorMode > 0.5) {
    let gray = luminance(color);
    color = vec3f(gray);
  }

  let styleInt = i32(uniforms.style + 0.5);

  if (styleInt == 0) {
    return vec4f(color, 1.0);
  } else if (styleInt == 1) {
    let localPos = (pixelPos - blockPos * uniforms.blockSize) / uniforms.blockSize;
    let shade = 0.9 + 0.1 * (1.0 - length(localPos - 0.5) * 1.4);
    return vec4f(color * shade, 1.0);
  } else {
    let localPos = pixelPos - blockPos * uniforms.blockSize;
    let bw = uniforms.borderWidth;
    let bs = uniforms.blockSize;
    let isEdge = localPos.x < bw || localPos.x > bs - bw ||
                 localPos.y < bw || localPos.y > bs - bw;
    if (isEdge) {
      let borderColor = vec3f(uniforms.borderColorR, uniforms.borderColorG, uniforms.borderColorB);
      return vec4f(borderColor, 1.0);
    }
    return vec4f(color, 1.0);
  }
}
`;

export class BlockifyEffect extends SinglePassEffect<BlockifyOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<BlockifyOptions> = {}) {
    super(device, format, { ...DEFAULT_OPTIONS, ...options });
  }
  
  protected getFragmentShader(): string {
    return FRAGMENT_SHADER;
  }
  
  protected getUniformBufferSize(): number {
    return 48;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(12);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.blockSize;
    data[3] = this.options.style;
    data[4] = this.options.borderWidth;
    data[5] = this.options.brightness;
    data[6] = this.options.contrast;
    data[7] = this.options.borderColor[0];
    data[8] = this.options.borderColor[1];
    data[9] = this.options.borderColor[2];
    data[10] = this.options.colorMode;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
