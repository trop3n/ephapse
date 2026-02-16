import { SinglePassEffect } from './singlePassEffect';

export interface BlurOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  radius: number;
}

const DEFAULT_OPTIONS: BlurOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  radius: 5,
};

const FRAGMENT_SHADER = `
struct BlurUniforms {
  resolution: vec2f,
  radius: f32,
  _pad: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: BlurUniforms;

fn gaussian(x: f32, sigma: f32) -> f32 {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brt: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brt);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;
  let sigma = max(uniforms.radius * 0.4, 1.0);
  
  var color = vec4f(0.0);
  var totalWeight = 0.0;
  
  let kernelRadius = min(i32(uniforms.radius), 15);
  
  for (var y = -kernelRadius; y <= kernelRadius; y++) {
    for (var x = -kernelRadius; x <= kernelRadius; x++) {
      let dist = sqrt(f32(x * x + y * y));
      if (dist > f32(kernelRadius)) {
        continue;
      }
      
      let weight = gaussian(dist, sigma);
      let sampleUV = clamp(texCoord + vec2f(f32(x), f32(y)) * pixelSize, vec2f(0.0), vec2f(1.0));
      color += textureSampleLevel(inputTexture, texSampler, sampleUV, 0.0) * weight;
      totalWeight += weight;
    }
  }
  
  let finalColor = (color / totalWeight).rgb;
  return vec4f(applyBrightnessContrast(finalColor, 0.0, 0.0), 1.0);
}
`;

export class BlurEffect extends SinglePassEffect<BlurOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<BlurOptions> = {}) {
    super(device, format, { ...DEFAULT_OPTIONS, ...options });
  }
  
  protected getFragmentShader(): string {
    return FRAGMENT_SHADER;
  }
  
  protected getUniformBufferSize(): number {
    return 16;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(4);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.radius;
    data[3] = 0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
