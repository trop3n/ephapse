import { SinglePassEffect } from './singlePassEffect';

export interface MatrixRainOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  cellSize: number;
  speed: number;
  trailLength: number;
  time: number;
  rainColor: [number, number, number];
  bgOpacity: number;
  glowIntensity: number;
  direction: number;
  threshold: number;
  spacing: number;
}

const DEFAULT_OPTIONS: MatrixRainOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  cellSize: 12,
  speed: 1,
  trailLength: 15,
  time: 0,
  rainColor: [0, 1, 0],
  bgOpacity: 0.3,
  glowIntensity: 1,
  direction: 0,
  threshold: 0.1,
  spacing: 0.1,
};

const FRAGMENT_SHADER = `
struct MatrixRainUniforms {
  resolution: vec2f,
  cellSize: f32,
  speed: f32,
  trailLength: f32,
  time: f32,
  rainColorR: f32,
  rainColorG: f32,
  rainColorB: f32,
  bgOpacity: f32,
  glowIntensity: f32,
  direction: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
  threshold: f32,
  spacing: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: MatrixRainUniforms;

fn hash11(p: f32) -> f32 {
  var p2 = fract(p * 0.1031);
  p2 *= p2 + 33.33;
  p2 *= p2 + p2;
  return fract(p2);
}

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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

fn getRainIntensity(columnIndex: f32, rowPos: f32, time: f32, speed: f32, trailLen: f32, direction: f32) -> vec2f {
  let numDrops = 3;
  var maxIntensity = 0.0;
  var isHead = 0.0;

  for (var i = 0; i < numDrops; i++) {
    let dropSeed = columnIndex * 73.156 + f32(i) * 31.71;
    let dropSpeed = 0.5 + hash11(dropSeed) * 0.5;
    let dropPhase = hash11(dropSeed + 17.3);
    let dropLength = trailLen * (0.7 + hash11(dropSeed + 41.7) * 0.6);

    let headPos = fract(time * speed * dropSpeed * 0.15 + dropPhase);

    var distFromHead: f32;
    if (direction < 0.5 || direction > 2.5) {
      distFromHead = headPos - rowPos;
      if (distFromHead < 0.0) {
        distFromHead += 1.0;
      }
    } else {
      let invertedHead = 1.0 - headPos;
      distFromHead = rowPos - invertedHead;
      if (distFromHead < 0.0) {
        distFromHead += 1.0;
      }
    }

    if (distFromHead < dropLength) {
      let trailIntensity = 1.0 - (distFromHead / dropLength);
      maxIntensity = max(maxIntensity, trailIntensity * trailIntensity);

      if (distFromHead < 0.02) {
        isHead = 1.0;
      }
    }
  }

  return vec2f(maxIntensity, isHead);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var srcColor = textureSample(inputTexture, texSampler, texCoord).rgb;
  srcColor = applyImageProcessing(srcColor);
  let srcBrightness = luminance(srcColor);

  let rainColor = vec3f(uniforms.rainColorR, uniforms.rainColorG, uniforms.rainColorB);
  let direction = uniforms.direction;

  let baseCellSize = max(uniforms.cellSize, 4.0);
  let spacingGap = baseCellSize * uniforms.spacing;
  let totalCellSize = baseCellSize + spacingGap;
  let cellsX = uniforms.resolution.x / totalCellSize;
  let cellsY = uniforms.resolution.y / totalCellSize;

  let cellX = floor(texCoord.x * cellsX);
  let cellY = floor(texCoord.y * cellsY);

  let cellUV = vec2f(
    fract(texCoord.x * cellsX),
    fract(texCoord.y * cellsY)
  );

  var columnIndex: f32;
  var rowPos: f32;
  if (direction > 1.5) {
    columnIndex = cellY;
    rowPos = texCoord.x;
  } else {
    columnIndex = cellX;
    rowPos = texCoord.y;
  }

  let trailLen = uniforms.trailLength / 50.0;

  let rainData = getRainIntensity(columnIndex, rowPos, uniforms.time, uniforms.speed, trailLen, direction);
  let rainIntensity = rainData.x;
  let isHead = rainData.y;

  let cellCenterUV = (vec2f(cellX, cellY) + 0.5) / vec2f(cellsX, cellsY);
  let cellColor = textureSample(inputTexture, texSampler, cellCenterUV).rgb;
  let cellBrightness = luminance(cellColor);

  let charSeed = hash21(vec2f(cellX, cellY));
  let charPattern = step(0.3, fract(charSeed * 100.0 + uniforms.time * 3.0));

  let edgeSampleOffset = 1.0 / max(cellsX, cellsY);
  let leftBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(-edgeSampleOffset, 0.0)).rgb);
  let rightBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(edgeSampleOffset, 0.0)).rgb);
  let topBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(0.0, -edgeSampleOffset)).rgb);
  let bottomBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(0.0, edgeSampleOffset)).rgb);
  let edgeStrength = abs(leftBright - rightBright) + abs(topBright - bottomBright);

  let sourceInfluence = cellBrightness * 0.7 + edgeStrength * 0.5;

  let thresholdCutoff = uniforms.threshold;
  let aboveThreshold = step(thresholdCutoff, cellBrightness);
  let thresholdedInfluence = sourceInfluence * aboveThreshold;

  let effectiveRain = rainIntensity * aboveThreshold + thresholdedInfluence * 0.4 * (1.0 - rainIntensity);

  let distFromCellCenter = length(cellUV - 0.5) * 2.0;
  let cellMask = 1.0 - smoothstep(0.6, 1.0, distFromCellCenter);

  let charVisibility = cellMask * charPattern * (0.15 + thresholdedInfluence * 0.85) * aboveThreshold;

  let bgColor = srcColor * uniforms.bgOpacity * 0.1;

  let tintedRain = mix(rainColor, rainColor * (0.5 + cellBrightness * 0.5), 0.3);
  var charColor = tintedRain * effectiveRain * charVisibility;

  if (isHead > 0.5 && charPattern > 0.5) {
    let headBrightness = 0.7 + edgeStrength * 0.5;
    let headColor = mix(rainColor, vec3f(1.0, 1.0, 1.0), headBrightness);
    charColor = max(charColor, headColor * charVisibility * uniforms.glowIntensity);
  }

  let staticIntensity = 0.2 * thresholdedInfluence * (1.0 - rainIntensity * 0.5) * aboveThreshold;
  let staticChars = rainColor * staticIntensity * charVisibility;

  let result = bgColor + charColor + staticChars;

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

export class MatrixRainEffect extends SinglePassEffect<MatrixRainOptions> {
  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<MatrixRainOptions> = {}) {
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
    data[2] = this.options.cellSize;
    data[3] = this.options.speed;
    data[4] = this.options.trailLength;
    data[5] = this.options.time;
    data[6] = this.options.rainColor[0];
    data[7] = this.options.rainColor[1];
    data[8] = this.options.rainColor[2];
    data[9] = this.options.bgOpacity;
    data[10] = this.options.glowIntensity;
    data[11] = this.options.direction;
    data[12] = this.options.brightness * 0.005;
    data[13] = this.options.contrast * 0.01;
    data[14] = Math.max(0.1, this.options.gamma);
    data[15] = this.options.saturation * 0.01;
    data[16] = this.options.hue / 360.0;
    data[17] = this.options.threshold;
    data[18] = this.options.spacing;
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }
}
