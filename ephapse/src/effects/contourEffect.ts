import { SinglePassEffect } from './singlePassEffect';

export interface ContourOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  levels: number;
  lineThickness: number;
  fillMode: number;
  lineColor: [number, number, number];
  bgColor: [number, number, number];
  colorMode: number;
  invert: boolean;
}

const DEFAULT_OPTIONS: ContourOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  levels: 8,
  lineThickness: 1.5,
  fillMode: 0,
  lineColor: [0, 0, 0],
  bgColor: [1, 1, 1],
  colorMode: 0,
  invert: false,
};

const FRAGMENT_SHADER = `
struct ContourUniforms {
  resolution: vec2f,
  levels: f32,
  lineThickness: f32,
  fillMode: f32,
  brightness: f32,
  contrast: f32,
  lineColorR: f32,
  lineColorG: f32,
  lineColorB: f32,
  bgColorR: f32,
  bgColorG: f32,
  bgColorB: f32,
  colorMode: f32,
  invert: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ContourUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn sampleBrightness(uv: vec2f) -> f32 {
  let color = textureSample(inputTexture, texSampler, uv).rgb;
  let adjusted = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);
  return luminance(adjusted);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  var brightness = luminance(color);

  if (uniforms.invert > 0.5) {
    brightness = 1.0 - brightness;
  }

  let quantized = floor(brightness * uniforms.levels) / uniforms.levels;
  let quantizedBrightness = quantized + 0.5 / uniforms.levels;

  let pixelSize = uniforms.lineThickness / uniforms.resolution;

  let left = sampleBrightness(texCoord + vec2f(-pixelSize.x, 0.0));
  let right = sampleBrightness(texCoord + vec2f(pixelSize.x, 0.0));
  let top = sampleBrightness(texCoord + vec2f(0.0, -pixelSize.y));
  let bottom = sampleBrightness(texCoord + vec2f(0.0, pixelSize.y));

  if (uniforms.invert > 0.5) {
  }

  let leftQ = floor(left * uniforms.levels);
  let rightQ = floor(right * uniforms.levels);
  let topQ = floor(top * uniforms.levels);
  let bottomQ = floor(bottom * uniforms.levels);
  let centerQ = floor(brightness * uniforms.levels);

  let isContour = (leftQ != centerQ) || (rightQ != centerQ) || (topQ != centerQ) || (bottomQ != centerQ);

  let lineColor = vec3f(uniforms.lineColorR, uniforms.lineColorG, uniforms.lineColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  if (isContour) {
    return vec4f(lineColor, 1.0);
  }

  let fillModeInt = i32(uniforms.fillMode + 0.5);
  if (fillModeInt == 1) {
    return vec4f(bgColor, 1.0);
  }

  let colorModeInt = i32(uniforms.colorMode + 0.5);
  if (colorModeInt == 1) {
    let quantizedColor = floor(color * uniforms.levels) / uniforms.levels + 0.5 / uniforms.levels;
    return vec4f(quantizedColor, 1.0);
  } else if (colorModeInt == 2) {
    let blendColor = mix(bgColor, lineColor, quantizedBrightness);
    return vec4f(blendColor, 1.0);
  } else {
    return vec4f(vec3f(quantizedBrightness), 1.0);
  }
}
`;

export class ContourEffect extends SinglePassEffect<ContourOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<ContourOptions> = {}) {
    super(device, format, { ...DEFAULT_OPTIONS, ...options });
  }
  
  protected getFragmentShader(): string {
    return FRAGMENT_SHADER;
  }
  
  protected getUniformBufferSize(): number {
    return 56;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(14);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.levels;
    data[3] = this.options.lineThickness;
    data[4] = this.options.fillMode;
    data[5] = this.options.brightness * 0.005;
    data[6] = this.options.contrast * 0.01;
    data[7] = this.options.lineColor[0];
    data[8] = this.options.lineColor[1];
    data[9] = this.options.lineColor[2];
    data[10] = this.options.bgColor[0];
    data[11] = this.options.bgColor[1];
    data[12] = this.options.bgColor[2];
    data[13] = this.options.colorMode;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
    
    const invertData = new Float32Array([this.options.invert ? 1 : 0]);
    this.device.queue.writeBuffer(this.uniformBuffer, 52, invertData);
  }
}
