/**
 * ASCII Effect Implementation
 * Two-pass GPU effect: compute pass for character matching, render pass for display
 * Using extracted grainrad.com shaders for full feature support
 */

import type { FontAtlas } from '../utils/fontAtlas';

export interface AsciiEffectOptions {
  cellSize: number;
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  invert: boolean;
  useOriginalColors: boolean;
  customColor: [number, number, number];
  backgroundColor: [number, number, number];
  spacing: number;
  sharpness: number;
  blur: number;
  edgeEnhance: number;
  brightnessMapping: number;
  quantizeColors: number;
  brightnessWeight: number;
  colorMode: 'color' | 'grayscale' | 'monochrome' | 'sepia' | 'original';
  matchQuality: 'fast' | 'balanced' | 'quality';
}

const DEFAULT_OPTIONS: AsciiEffectOptions = {
  cellSize: 12,
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 0,
  hue: 0,
  invert: false,
  useOriginalColors: true,
  customColor: [0, 1, 0],
  backgroundColor: [0, 0, 0],
  spacing: 0.1,
  sharpness: 0,
  blur: 0,
  edgeEnhance: 0,
  brightnessMapping: 1,
  quantizeColors: 0,
  brightnessWeight: 1.0,
  colorMode: 'color',
  matchQuality: 'balanced',
};

const ASCII_COMPUTE_SHADER = `
struct MatchUniforms {
  sourceSize: vec2f,           // offset 0
  cellSize: vec2f,             // offset 8
  gridSize: vec2u,             // offset 16 (uses 2 u32s)
  atlasSize: vec2f,            // offset 24
  atlasCharSize: vec2f,        // offset 32
  atlasCols: u32,              // offset 40
  charsetLength: u32,          // offset 44
  brightnessWeight: f32,       // offset 48
  invert: f32,                 // offset 52
  brightnessMapping: f32,      // offset 56
  imageBrightness: f32,        // offset 60
  imageContrast: f32,          // offset 64
  imageGamma: f32,             // offset 68
  samplesPerAxis: u32,         // offset 72
  _pad: f32,                   // offset 76 (padding)
}

@group(0) @binding(0) var sourceSampler: sampler;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var fontAtlas: texture_2d<f32>;
@group(0) @binding(3) var<storage, read_write> matchResult: array<u32>;
@group(0) @binding(4) var<uniform> uniforms: MatchUniforms;

const INV_200: f32 = 0.005;
const INV_100: f32 = 0.01;
const LUMA_R: f32 = 0.299;
const LUMA_G: f32 = 0.587;
const LUMA_B: f32 = 0.114;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let cellX = id.x;
  let cellY = id.y;

  if (cellX >= uniforms.gridSize.x || cellY >= uniforms.gridSize.y) {
    return;
  }

  let samplesPerAxis = uniforms.samplesPerAxis;
  let totalSamples = samplesPerAxis * samplesPerAxis;
  let invTotalSamples = 1.0 / f32(totalSamples);
  let invSamplesPerAxis = 1.0 / f32(samplesPerAxis);
  let invGamma = 1.0 / uniforms.imageGamma;
  let contrastFactor = (uniforms.imageContrast + 100.0) * INV_100;
  let brightnessOffset = uniforms.imageBrightness * INV_200;
  let invSourceSize = 1.0 / uniforms.sourceSize;
  let doInvert = uniforms.invert > 0.5;

  let cellUVStart = vec2f(f32(cellX), f32(cellY)) * uniforms.cellSize * invSourceSize;
  let cellUVSize = uniforms.cellSize * invSourceSize;

  var sourceBrightness = 0.0;
  var sourceSamples: array<f32, 16>;

  for (var sy = 0u; sy < samplesPerAxis; sy++) {
    for (var sx = 0u; sx < samplesPerAxis; sx++) {
      let sampleUV = cellUVStart + cellUVSize * vec2f(
        (f32(sx) + 0.5) * invSamplesPerAxis,
        (f32(sy) + 0.5) * invSamplesPerAxis
      );
      let color = textureSampleLevel(sourceTexture, sourceSampler, sampleUV, 0.0);

      var brightness = color.r * LUMA_R + color.g * LUMA_G + color.b * LUMA_B;
      brightness = pow(brightness, invGamma);
      brightness = brightness + brightnessOffset;
      brightness = (brightness - 0.5) * contrastFactor + 0.5;
      brightness = pow(clamp(brightness, 0.0, 1.0), uniforms.brightnessMapping);
      brightness = select(brightness, 1.0 - brightness, doInvert);
      brightness = clamp(brightness, 0.0, 1.0);

      sourceSamples[sy * samplesPerAxis + sx] = brightness;
      sourceBrightness += brightness;
    }
  }
  
  sourceBrightness *= invTotalSamples;

  let indexBasedMatch = u32(clamp(sourceBrightness, 0.0, 0.9999) * f32(uniforms.charsetLength));

  if (uniforms.brightnessWeight >= 0.99) {
    let cellIndex = cellY * uniforms.gridSize.x + cellX;
    matchResult[cellIndex] = indexBasedMatch;
    return;
  }

  var bestMatch = 0u;
  var bestScore = 999999.0;

  let atlasTexSize = vec2f(textureDimensions(fontAtlas));
  let invAtlasTexSize = 1.0 / atlasTexSize;
  let charsetLenF = f32(uniforms.charsetLength);
  let charsetLenMinus1F = f32(uniforms.charsetLength - 1u);
  let invCharsetLen = 1.0 / charsetLenF;
  let expectedIndex = sourceBrightness * charsetLenMinus1F;
  let spatialWeight = 1.0 - uniforms.brightnessWeight;

  for (var charIdx = 0u; charIdx < uniforms.charsetLength; charIdx++) {
    let indexDist = abs(f32(charIdx) - expectedIndex) * invCharsetLen;

    var spatialDistSq = 0.0;
    let atlasCol = charIdx % uniforms.atlasCols;
    let atlasRow = charIdx / uniforms.atlasCols;
    let atlasCharStart = vec2f(f32(atlasCol), f32(atlasRow)) * uniforms.atlasCharSize;

    for (var sy = 0u; sy < samplesPerAxis; sy++) {
      for (var sx = 0u; sx < samplesPerAxis; sx++) {
        let atlasUV = (atlasCharStart + uniforms.atlasCharSize * vec2f(
          (f32(sx) + 0.5) * invSamplesPerAxis,
          (f32(sy) + 0.5) * invSamplesPerAxis
        )) * invAtlasTexSize;

        let atlasBrightness = textureSampleLevel(fontAtlas, sourceSampler, atlasUV, 0.0).r;
        let sourceSample = sourceSamples[sy * samplesPerAxis + sx];

        let diff = sourceSample - atlasBrightness;
        spatialDistSq += diff * diff;
      }
    }

    let spatialDist = spatialDistSq * invTotalSamples;
    let score = indexDist * uniforms.brightnessWeight + spatialDist * spatialWeight;

    if (score < bestScore) {
      bestScore = score;
      bestMatch = charIdx;
    }
  }

  let cellIndex = cellY * uniforms.gridSize.x + cellX;
  matchResult[cellIndex] = bestMatch;
}
`;

const ASCII_RENDER_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct AsciiUniforms {
  sourceSize: vec2f,        // offset 0
  outputSize: vec2f,        // offset 8
  cellSize: vec2f,          // offset 16
  atlasSize: vec2f,         // offset 24
  atlasCharSize: vec2f,     // offset 32
  atlasCols: f32,           // offset 40
  charsetLength: f32,       // offset 44
  brightness: f32,          // offset 48
  contrast: f32,            // offset 52
  invert: f32,              // offset 56
  useOriginalColors: f32,   // offset 60
  customColorR: f32,        // offset 64
  customColorG: f32,        // offset 68
  customColorB: f32,        // offset 72
  spacing: f32,             // offset 76
  saturation: f32,          // offset 80
  hue: f32,                 // offset 84
  sharpness: f32,           // offset 88
  gamma: f32,               // offset 92
  imageColorMode: f32,      // offset 96
  gridCols: f32,            // offset 100
  backgroundColorR: f32,    // offset 104
  backgroundColorG: f32,    // offset 108
  backgroundColorB: f32,    // offset 112
  brightnessMapping: f32,   // offset 116
  edgeEnhance: f32,         // offset 120
  blur: f32,                // offset 124
  quantizeColors: f32,      // offset 128
  _pad: f32,                // offset 132
}

@group(0) @binding(0) var sourceSampler: sampler;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var fontAtlas: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> matchResult: array<u32>;
@group(0) @binding(4) var<uniform> uniforms: AsciiUniforms;

const INV_200: f32 = 0.005;
const INV_100: f32 = 0.01;
const INV_360: f32 = 0.002777778;
const INV_25: f32 = 0.04;
const LUMA_R: f32 = 0.299;
const LUMA_G: f32 = 0.587;
const LUMA_B: f32 = 0.114;
const ONE_THIRD: f32 = 0.333333333;
const TWO_THIRDS: f32 = 0.666666667;
const ONE_SIXTH: f32 = 0.166666667;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  var uv = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.texCoord = uv[vertexIndex];
  return output;
}

fn rgbToHsl(c: vec3f) -> vec3f {
  let maxC = max(max(c.r, c.g), c.b);
  let minC = min(min(c.r, c.g), c.b);
  let l = (maxC + minC) * 0.5;

  if (maxC == minC) {
    return vec3f(0.0, 0.0, l);
  }

  let d = maxC - minC;
  let s = select(d / (2.0 - maxC - minC), d / (maxC + minC), l > 0.5);

  var h: f32;
  if (maxC == c.r) {
    h = (c.g - c.b) / d + select(0.0, 6.0, c.g < c.b);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h = h * ONE_SIXTH;

  return vec3f(h, s, l);
}

fn hueToRgb(p: f32, q: f32, t_in: f32) -> f32 {
  var t = t_in;
  t = t - floor(t);

  if (t < ONE_SIXTH) { return p + (q - p) * 6.0 * t; }
  if (t < 0.5) { return q; }
  if (t < TWO_THIRDS) { return p + (q - p) * (TWO_THIRDS - t) * 6.0; }
  return p;
}

fn hslToRgb(hsl: vec3f) -> vec3f {
  if (hsl.y == 0.0) {
    return vec3f(hsl.z);
  }

  let q = select(hsl.z + hsl.y - hsl.z * hsl.y, hsl.z * (1.0 + hsl.y), hsl.z < 0.5);
  let p = 2.0 * hsl.z - q;

  return vec3f(
    hueToRgb(p, q, hsl.x + ONE_THIRD),
    hueToRgb(p, q, hsl.x),
    hueToRgb(p, q, hsl.x - ONE_THIRD)
  );
}

fn applyImageProcessing(color: vec3f, invGamma: f32, brightnessOffset: f32, 
  contrastFactor: f32, satFactor: f32, colorMode: i32) -> vec3f {
  
  var c = color;

  c = pow(c, vec3f(invGamma));
  c = c + brightnessOffset;
  c = (c - 0.5) * contrastFactor + 0.5;

  let gray = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
  c = mix(vec3f(gray), c, satFactor);

  if (uniforms.hue > 0.0) {
    let hsl = rgbToHsl(c);
    let newHue = fract(hsl.x + uniforms.hue * INV_360);
    c = hslToRgb(vec3f(newHue, hsl.y, hsl.z));
  }

  if (colorMode == 1) {
    let grayVal = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
    c = vec3f(grayVal);
  } else if (colorMode == 2) {
    let grayVal = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
    c = select(vec3f(0.0), vec3f(1.0), grayVal > 0.5);
  } else if (colorMode == 3) {
    let grayVal = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
    c = vec3f(grayVal * 1.2, grayVal, grayVal * 0.8);
  }

  return clamp(c, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let invCellSize = 1.0 / uniforms.cellSize;
  let invOutputSize = 1.0 / uniforms.outputSize;
  let invAtlasSize = 1.0 / uniforms.atlasSize;
  let texelSize = 1.0 / uniforms.sourceSize;

  let invGamma = 1.0 / uniforms.gamma;
  let brightnessOffset = uniforms.brightness * INV_200;
  let contrastFactor = (uniforms.contrast + 100.0) * INV_100;
  let satFactor = (uniforms.saturation + 100.0) * INV_100;
  let colorMode = i32(uniforms.imageColorMode + 0.5);

  let pixelPos = texCoord * uniforms.outputSize;
  let cellPos = floor(pixelPos * invCellSize);
  let cellUV = fract(pixelPos * invCellSize);

  let gapRatio = uniforms.spacing * 0.5;
  let charArea = 1.0 - gapRatio;
  let halfGap = gapRatio * 0.5;

  let inGapX = cellUV.x < halfGap || cellUV.x > (1.0 - halfGap);
  let inGapY = cellUV.y < halfGap || cellUV.y > (1.0 - halfGap);
  let inGap = inGapX || inGapY;

  let invCharArea = 1.0 / charArea;
  let remappedUV = (cellUV - halfGap) * invCharArea;
  let clampedCellUV = saturate(remappedUV);

  let numCells = floor(uniforms.outputSize * invCellSize);
  let invNumCells = 1.0 / numCells;

  let sourceUV = (cellPos + 0.5) * invNumCells;
  let clampedSourceUV = saturate(sourceUV);

  var sourceColor = textureSample(sourceTexture, sourceSampler, clampedSourceUV);

  if (uniforms.blur > 0.0) {
    let blurRadius = uniforms.blur;
    var blurredColor = vec3f(0.0);
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        let offset = vec2f(f32(dx), f32(dy)) * texelSize * blurRadius;
        blurredColor += textureSample(sourceTexture, sourceSampler, clampedSourceUV + offset).rgb;
      }
    }
    sourceColor = vec4f(blurredColor * INV_25, sourceColor.a);
  }

  if (uniforms.edgeEnhance > 0.0) {
    let center = sourceColor.rgb;
    let left = textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(-texelSize.x, 0.0)).rgb;
    let right = textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(texelSize.x, 0.0)).rgb;
    let top = textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(0.0, -texelSize.y)).rgb;
    let bottom = textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(0.0, texelSize.y)).rgb;
    let laplacian = center * 4.0 - left - right - top - bottom;
    let edgeAmount = uniforms.edgeEnhance * INV_100;
    sourceColor = vec4f(center + laplacian * edgeAmount, sourceColor.a);
  }

  if (uniforms.sharpness > 0.0) {
    let blurSample = (
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(-texelSize.x, 0.0)).rgb +
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(texelSize.x, 0.0)).rgb +
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(0.0, -texelSize.y)).rgb +
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(0.0, texelSize.y)).rgb
    ) * 0.25;
    let sharpAmount = uniforms.sharpness * INV_100;
    sourceColor = vec4f(sourceColor.rgb + (sourceColor.rgb - blurSample) * sharpAmount, sourceColor.a);
  }

  var processedRgb = sourceColor.rgb;
  if (uniforms.quantizeColors > 1.0) {
    let levels = uniforms.quantizeColors;
    let invLevelsMinus1 = 1.0 / (levels - 1.0);
    processedRgb = floor(processedRgb * levels) * invLevelsMinus1;
  }

  let processedColor = applyImageProcessing(processedRgb, invGamma, brightnessOffset, 
    contrastFactor, satFactor, colorMode);

  let gridCols = u32(uniforms.gridCols);
  let cellIndex = u32(cellPos.y) * gridCols + u32(cellPos.x);
  let charIndex = matchResult[cellIndex];

  let atlasColsU = u32(uniforms.atlasCols);
  let atlasCol = f32(charIndex % atlasColsU);
  let atlasRow = f32(charIndex / atlasColsU);

  let atlasCharUV = vec2f(
    (atlasCol + clampedCellUV.x) * uniforms.atlasCharSize.x,
    (atlasRow + clampedCellUV.y) * uniforms.atlasCharSize.y
  ) * invAtlasSize;

  let atlasColor = textureSample(fontAtlas, sourceSampler, atlasCharUV);
  let charIntensity = select(atlasColor.r, 0.0, inGap && uniforms.spacing > 0.01);

  let customColor = vec3f(uniforms.customColorR, uniforms.customColorG, uniforms.customColorB);
  let finalColor = select(customColor, processedColor, uniforms.useOriginalColors > 0.5);

  let backgroundColor = vec3f(uniforms.backgroundColorR, uniforms.backgroundColorG, uniforms.backgroundColorB);
  let outputColor = mix(backgroundColor, finalColor, charIntensity);

  return vec4f(outputColor, 1.0);
}
`;

export class AsciiEffect {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private fontAtlas: FontAtlas;
  private options: AsciiEffectOptions;

  private computePipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;
  private computeBindGroupLayout!: GPUBindGroupLayout;
  private renderBindGroupLayout!: GPUBindGroupLayout;
  private sampler!: GPUSampler;
  
  private matchUniformBuffer!: GPUBuffer;
  private asciiUniformBuffer!: GPUBuffer;
  private matchResultBuffer!: GPUBuffer;
  
  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    fontAtlas: FontAtlas,
    options: Partial<AsciiEffectOptions> = {}
  ) {
    this.device = device;
    this.format = format;
    this.fontAtlas = fontAtlas;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    this.init();
  }
  
  private init() {
    this.createSampler();
    this.createBindGroupLayouts();
    this.createPipelines();
    this.createBuffers();
  }
  
  private createSampler() {
    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });
  }
  
  private createBindGroupLayouts() {
    this.computeBindGroupLayout = this.device.createBindGroupLayout({
      label: 'ASCII Compute Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: {} },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: {} },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });
    
    this.renderBindGroupLayout = this.device.createBindGroupLayout({
      label: 'ASCII Render Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      ],
    });
  }
  
  private createPipelines() {
    const computeShaderModule = this.device.createShaderModule({
      label: 'ASCII Compute Shader',
      code: ASCII_COMPUTE_SHADER,
    });
    
    const computePipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.computeBindGroupLayout],
    });
    
    this.computePipeline = this.device.createComputePipeline({
      label: 'ASCII Compute Pipeline',
      layout: computePipelineLayout,
      compute: { module: computeShaderModule, entryPoint: 'main' },
    });
    
    const renderShaderModule = this.device.createShaderModule({
      label: 'ASCII Render Shader',
      code: ASCII_RENDER_SHADER,
    });
    
    const renderPipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.renderBindGroupLayout],
    });
    
    this.renderPipeline = this.device.createRenderPipeline({
      label: 'ASCII Render Pipeline',
      layout: renderPipelineLayout,
      vertex: { module: renderShaderModule, entryPoint: 'vertexMain' },
      fragment: { module: renderShaderModule, entryPoint: 'fragmentMain', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    });
  }
  
  private createBuffers() {
    const maxGridCells = 4096 * 4096;
    
    this.matchResultBuffer = this.device.createBuffer({
      label: 'Match Result Buffer',
      size: maxGridCells * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    this.matchUniformBuffer = this.device.createBuffer({
      label: 'Match Uniforms',
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    this.asciiUniformBuffer = this.device.createBuffer({
      label: 'ASCII Uniforms',
      size: 144,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }
  
  render(
    sourceTexture: GPUTexture,
    outputView: GPUTextureView,
    outputWidth: number,
    outputHeight: number
  ): void {
    const sourceWidth = sourceTexture.width;
    const sourceHeight = sourceTexture.height;
    const cellSize = this.options.cellSize;
    const gridCols = Math.floor(outputWidth / cellSize);
    const gridRows = Math.floor(outputHeight / cellSize);
    
    this.updateMatchUniforms(sourceWidth, sourceHeight, gridCols, gridRows);
    this.updateAsciiUniforms(sourceWidth, sourceHeight, outputWidth, outputHeight, gridCols);
    
    const computeBindGroup = this.device.createBindGroup({
      layout: this.computeBindGroupLayout,
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: sourceTexture.createView() },
        { binding: 2, resource: this.fontAtlas.texture.createView() },
        { binding: 3, resource: { buffer: this.matchResultBuffer } },
        { binding: 4, resource: { buffer: this.matchUniformBuffer } },
      ],
    });
    
    const renderBindGroup = this.device.createBindGroup({
      layout: this.renderBindGroupLayout,
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: sourceTexture.createView() },
        { binding: 2, resource: this.fontAtlas.texture.createView() },
        { binding: 3, resource: { buffer: this.matchResultBuffer } },
        { binding: 4, resource: { buffer: this.asciiUniformBuffer } },
      ],
    });
    
    const encoder = this.device.createCommandEncoder();
    
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(gridCols / 8), Math.ceil(gridRows / 8));
    computePass.end();
    
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: outputView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(3);
    renderPass.end();
    
    this.device.queue.submit([encoder.finish()]);
  }
  
  private updateMatchUniforms(sourceWidth: number, sourceHeight: number, gridCols: number, gridRows: number) {
    const samplesPerAxis = this.options.matchQuality === 'fast' ? 2 :
                           this.options.matchQuality === 'quality' ? 4 : 3;
    
    const buffer = new ArrayBuffer(80);
    const floatView = new Float32Array(buffer);
    const uintView = new Uint32Array(buffer);
    
    floatView[0] = sourceWidth;
    floatView[1] = sourceHeight;
    floatView[2] = this.options.cellSize;
    floatView[3] = this.options.cellSize;
    uintView[4] = gridCols;
    uintView[5] = gridRows;
    floatView[6] = this.fontAtlas.width;
    floatView[7] = this.fontAtlas.height;
    floatView[8] = this.fontAtlas.charWidth;
    floatView[9] = this.fontAtlas.charHeight;
    uintView[10] = this.fontAtlas.cols;
    uintView[11] = this.fontAtlas.charset.length;
    floatView[12] = this.options.brightnessWeight;
    floatView[13] = this.options.invert ? 1 : 0;
    floatView[14] = this.options.brightnessMapping;
    floatView[15] = this.options.brightness;
    floatView[16] = this.options.contrast;
    floatView[17] = this.options.gamma;
    uintView[18] = samplesPerAxis;
    floatView[19] = 0;
    
    this.device.queue.writeBuffer(this.matchUniformBuffer, 0, buffer);
  }
  
  private updateAsciiUniforms(sourceWidth: number, sourceHeight: number, outputWidth: number, outputHeight: number, gridCols: number) {
    const colorModeMap: Record<string, number> = {
      'color': 0, 'grayscale': 1, 'monochrome': 2, 'sepia': 3, 'original': 6,
    };
    
    const data = new Float32Array(36);
    let offset = 0;
    
    data[offset++] = sourceWidth;
    data[offset++] = sourceHeight;
    data[offset++] = outputWidth;
    data[offset++] = outputHeight;
    data[offset++] = this.options.cellSize;
    data[offset++] = this.options.cellSize;
    data[offset++] = this.fontAtlas.width;
    data[offset++] = this.fontAtlas.height;
    data[offset++] = this.fontAtlas.charWidth;
    data[offset++] = this.fontAtlas.charHeight;
    data[offset++] = this.fontAtlas.cols;
    data[offset++] = this.fontAtlas.charset.length;
    data[offset++] = this.options.brightness;
    data[offset++] = this.options.contrast;
    data[offset++] = this.options.invert ? 1 : 0;
    data[offset++] = this.options.useOriginalColors ? 1 : 0;
    data[offset++] = this.options.customColor[0];
    data[offset++] = this.options.customColor[1];
    data[offset++] = this.options.customColor[2];
    data[offset++] = this.options.spacing;
    data[offset++] = this.options.saturation;
    data[offset++] = this.options.hue;
    data[offset++] = this.options.sharpness;
    data[offset++] = this.options.gamma;
    data[offset++] = colorModeMap[this.options.colorMode] ?? 0;
    data[offset++] = gridCols;
    data[offset++] = this.options.backgroundColor[0];
    data[offset++] = this.options.backgroundColor[1];
    data[offset++] = this.options.backgroundColor[2];
    data[offset++] = this.options.brightnessMapping;
    data[offset++] = this.options.edgeEnhance;
    data[offset++] = this.options.blur;
    data[offset++] = this.options.quantizeColors;
    data[offset++] = 0;
    
    this.device.queue.writeBuffer(this.asciiUniformBuffer, 0, data);
  }
  
  updateOptions(options: Partial<AsciiEffectOptions>) {
    this.options = { ...this.options, ...options };
  }
  
  destroy() {
    this.matchResultBuffer.destroy();
    this.matchUniformBuffer.destroy();
    this.asciiUniformBuffer.destroy();
  }
}
