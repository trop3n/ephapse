import { SinglePassEffect } from './singlePassEffect';

export interface VoronoiOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  cellSize: number;
  edgeWidth: number;
  edgeColor: number;
  colorMode: number;
  randomize: number;
}

const DEFAULT_OPTIONS: VoronoiOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  cellSize: 30,
  edgeWidth: 0.5,
  edgeColor: 0,
  colorMode: 0,
  randomize: 0.5,
};

const FRAGMENT_SHADER = `
struct VoronoiUniforms {
  resolution: vec2f,
  cellSize: f32,
  edgeWidth: f32,
  edgeColor: f32,
  colorMode: f32,
  randomize: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: VoronoiUniforms;

fn hash2(p: vec2f) -> vec2f {
  let k = vec2f(0.3183099, 0.3678794);
  var pp = p * k + k.yx;
  return fract(16.0 * k * fract(pp.x * pp.y * (pp.x + pp.y))) * 2.0 - 1.0;
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

fn voronoi(p: vec2f, randomness: f32) -> vec4f {
  let cellP = floor(p);
  let fractP = fract(p);

  var minDist = 8.0;
  var minDist2 = 8.0;
  var closestCell = vec2f(0.0);

  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let neighbor = vec2f(f32(x), f32(y));
      let cellCenter = cellP + neighbor;

      let randOffset = hash2(cellCenter) * randomness * 0.5;
      let point = neighbor + 0.5 + randOffset;

      let dist = length(point - fractP);

      if (dist < minDist) {
        minDist2 = minDist;
        minDist = dist;
        closestCell = cellCenter;
      } else if (dist < minDist2) {
        minDist2 = dist;
      }
    }
  }

  return vec4f(closestCell, minDist, minDist2);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixel = texCoord * uniforms.resolution;
  let cellScale = uniforms.cellSize;
  let scaledP = pixel / cellScale;

  let vor = voronoi(scaledP, uniforms.randomize);
  let closestCell = vor.xy;
  let minDist = vor.z;
  let minDist2 = vor.w;

  let edgeDist = minDist2 - minDist;
  let edge = smoothstep(0.0, uniforms.edgeWidth * 0.3, edgeDist);

  var cellColor: vec3f;

  if (uniforms.colorMode < 0.5) {
    var avgColor = vec3f(0.0);
    var samples = 0.0;

    for (var dy = -2; dy <= 2; dy = dy + 1) {
      for (var dx = -2; dx <= 2; dx = dx + 1) {
        let sampleOffset = vec2f(f32(dx), f32(dy)) * 0.2;
        let sampleUV = (closestCell + 0.5 + sampleOffset) * cellScale / uniforms.resolution;
        let clampedUV = clamp(sampleUV, vec2f(0.0), vec2f(1.0));
        avgColor = avgColor + textureSampleLevel(inputTexture, texSampler, clampedUV, 0.0).rgb;
        samples = samples + 1.0;
      }
    }
    cellColor = avgColor / samples;
  } else if (uniforms.colorMode < 1.5) {
    let centerUV = (closestCell + 0.5) * cellScale / uniforms.resolution;
    let clampedUV = clamp(centerUV, vec2f(0.0), vec2f(1.0));
    cellColor = textureSampleLevel(inputTexture, texSampler, clampedUV, 0.0).rgb;
  } else {
    let centerUV = (closestCell + 0.5) * cellScale / uniforms.resolution;
    let currentColor = textureSampleLevel(inputTexture, texSampler, texCoord, 0.0).rgb;
    let centerColor = textureSampleLevel(inputTexture, texSampler, clamp(centerUV, vec2f(0.0), vec2f(1.0)), 0.0).rgb;

    let gradientT = smoothstep(0.0, 0.7, minDist);
    cellColor = mix(centerColor, currentColor, gradientT * 0.5);
  }

  var edgeCol: vec3f;
  if (uniforms.edgeColor < 0.5) {
    edgeCol = vec3f(0.0);
  } else if (uniforms.edgeColor < 1.5) {
    edgeCol = vec3f(1.0);
  } else {
    edgeCol = cellColor * 0.3;
  }

  var finalColor = mix(edgeCol, cellColor, edge);

  finalColor = applyImageProcessing(finalColor);
  return vec4f(finalColor, 1.0);
}
`;

export class VoronoiEffect extends SinglePassEffect<VoronoiOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<VoronoiOptions> = {}) {
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
    data[2] = this.options.cellSize;
    data[3] = this.options.edgeWidth;
    data[4] = this.options.edgeColor;
    data[5] = this.options.colorMode;
    data[6] = this.options.randomize;
    data[7] = this.options.brightness * 0.005;
    data[8] = this.options.contrast * 0.01;
    data[9] = Math.max(0.1, this.options.gamma);
    data[10] = this.options.saturation * 0.01;
    data[11] = this.options.hue / 360.0;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
