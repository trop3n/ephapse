import { SinglePassEffect } from './singlePassEffect';

export interface ContourOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
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
  gamma: 1,
  saturation: 0,
  hue: 0,
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
  gamma: f32,
  saturation: f32,
  hue: f32,
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

fn sampleBrightness(uv: vec2f) -> f32 {
  let color = textureSample(inputTexture, texSampler, uv).rgb;
  let adjusted = applyImageProcessing(color);
  return luminance(adjusted);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyImageProcessing(color);

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
    return 80;
  }
  
  protected writeUniforms(): void {
    const data = new Float32Array(20);
    data[0] = this.options.resolution[0];
    data[1] = this.options.resolution[1];
    data[2] = this.options.levels;
    data[3] = this.options.lineThickness;
    data[4] = this.options.fillMode;
    data[5] = this.options.brightness * 0.005;
    data[6] = this.options.contrast * 0.01;
    data[7] = Math.max(0.1, this.options.gamma);
    data[8] = this.options.saturation * 0.01;
    data[9] = this.options.hue / 360.0;
    data[10] = this.options.lineColor[0];
    data[11] = this.options.lineColor[1];
    data[12] = this.options.lineColor[2];
    data[13] = this.options.bgColor[0];
    data[14] = this.options.bgColor[1];
    data[15] = this.options.bgColor[2];
    data[16] = this.options.colorMode;
    data[17] = this.options.invert ? 1 : 0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
