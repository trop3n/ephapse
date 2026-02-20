import { SinglePassEffect } from './singlePassEffect';

export interface BlurOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  radius: number;
}

const DEFAULT_OPTIONS: BlurOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  radius: 5,
};

const FRAGMENT_SHADER = `
struct BlurUniforms {
  resolution: vec2f,
  radius: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
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
  return vec4f(applyImageProcessing(finalColor), 1.0);
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
    return 32;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(8);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.radius;
    data[3] = this.options.brightness * 0.005;
    data[4] = this.options.contrast * 0.01;
    data[5] = Math.max(0.1, this.options.gamma);
    data[6] = this.options.saturation * 0.01;
    data[7] = this.options.hue / 360.0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
