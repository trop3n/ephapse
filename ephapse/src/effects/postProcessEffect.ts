/**
 * Post-Processing Pipeline
 * Handles bloom (multi-pass) and final post-processing effects
 */

export interface PostProcessOptions {
  time: number;
  bloom: {
    enabled: boolean;
    intensity: number;
    threshold: number;
    radius: number;
  };
  grain: {
    enabled: boolean;
    intensity: number;
    size: number;
    speed: number;
  };
  chromatic: {
    enabled: boolean;
    offset: number;
  };
  scanlines: {
    enabled: boolean;
    opacity: number;
    spacing: number;
  };
  vignette: {
    enabled: boolean;
    intensity: number;
    radius: number;
  };
  crt: {
    enabled: boolean;
    amount: number;
  };
  phosphor: {
    enabled: boolean;
    color: [number, number, number];
  };
}

const DEFAULT_OPTIONS: PostProcessOptions = {
  time: 0,
  bloom: { enabled: false, intensity: 0.5, threshold: 0.7, radius: 3 },
  grain: { enabled: false, intensity: 20, size: 1, speed: 1 },
  chromatic: { enabled: false, offset: 2 },
  scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
  vignette: { enabled: false, intensity: 0.5, radius: 0.7 },
  crt: { enabled: false, amount: 0.1 },
  phosphor: { enabled: false, color: [0, 1, 0] },
};

const THRESHOLD_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct ThresholdUniforms {
  threshold: f32,
  softThreshold: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ThresholdUniforms;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));
  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.texCoord = uv[vertexIndex];
  return output;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let color = textureSample(inputTexture, texSampler, texCoord);
  let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
  let brightness = smoothstep(uniforms.threshold - 0.1, uniforms.threshold + 0.1, luminance);
  return vec4f(color.rgb * brightness, 1.0);
}
`;

const BLUR_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct BlurUniforms {
  direction: vec2f,
  resolution: vec2f,
  radius: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: BlurUniforms;

fn gaussian(x: f32, sigma: f32) -> f32 {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));
  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.texCoord = uv[vertexIndex];
  return output;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;
  let pixelStep = uniforms.direction * pixelSize;
  let sigma = max(uniforms.radius * 0.5, 1.0);

  var color = vec4f(0.0);
  var totalWeight = 0.0;

  for (var i = -6; i <= 6; i++) {
    let pixelOffset = f32(i) * (uniforms.radius / 6.0);
    let weight = gaussian(f32(i), sigma / (uniforms.radius / 6.0));
    let sampleUV = clamp(texCoord + pixelStep * pixelOffset, vec2f(0.0), vec2f(1.0));
    color += textureSample(inputTexture, texSampler, sampleUV) * weight;
    totalWeight += weight;
  }

  return color / totalWeight;
}
`;

const POST_PROCESS_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct PostProcessUniforms {
  resolution: vec2f,
  time: f32,
  bloomEnabled: u32,
  bloomIntensity: f32,
  grainEnabled: u32,
  grainIntensity: f32,
  grainSize: f32,
  grainSpeed: f32,
  chromaticEnabled: u32,
  chromaticOffset: f32,
  scanlinesEnabled: u32,
  scanlinesOpacity: f32,
  scanlinesSpacing: f32,
  vignetteEnabled: u32,
  vignetteIntensity: f32,
  vignetteRadius: f32,
  crtEnabled: u32,
  crtAmount: f32,
  phosphorEnabled: u32,
  _pad1: f32,
  phosphorColorR: f32,
  phosphorColorG: f32,
  phosphorColorB: f32,
  _pad2: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: PostProcessUniforms;
@group(0) @binding(3) var bloomTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));
  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.texCoord = uv[vertexIndex];
  return output;
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn crtDistort(uv: vec2f, amount: f32) -> vec2f {
  let centered = uv - 0.5;
  let dist = dot(centered, centered);
  let distorted = centered * (1.0 + dist * amount);
  return distorted + 0.5;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;

  let crtActive = uniforms.crtEnabled == 1u && uniforms.crtAmount > 0.0;
  let distortedUV = crtDistort(texCoord, uniforms.crtAmount);
  let uv = select(texCoord, distortedUV, crtActive);
  let outOfBounds = crtActive && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0);

  var color = textureSample(inputTexture, texSampler, clamp(uv, vec2f(0.0), vec2f(1.0)));

  let chromaticOffset = uniforms.chromaticOffset * pixelSize.x * f32(uniforms.chromaticEnabled);
  let rShift = textureSample(inputTexture, texSampler, vec2f(uv.x - chromaticOffset, uv.y)).r;
  let bShift = textureSample(inputTexture, texSampler, vec2f(uv.x + chromaticOffset, uv.y)).b;
  color.r = select(color.r, rShift, uniforms.chromaticEnabled == 1u && uniforms.chromaticOffset > 0.0);
  color.b = select(color.b, bShift, uniforms.chromaticEnabled == 1u && uniforms.chromaticOffset > 0.0);

  if (uniforms.bloomEnabled == 1u) {
    let bloom = textureSample(bloomTexture, texSampler, uv);
    color = vec4f(color.rgb + bloom.rgb * uniforms.bloomIntensity, color.a);
  }

  let fragY = uv.y * uniforms.resolution.y;
  let scanline = fragY % (uniforms.scanlinesSpacing * 2.0);
  let scanlineActive = f32(uniforms.scanlinesEnabled == 1u && scanline < uniforms.scanlinesSpacing);
  color = vec4f(color.rgb * (1.0 - uniforms.scanlinesOpacity * scanlineActive), color.a);

  let grainUV = floor(uv * uniforms.resolution / max(uniforms.grainSize, 1.0)) * max(uniforms.grainSize, 1.0);
  let noise = hash(grainUV + uniforms.time * uniforms.grainSpeed) - 0.5;
  let grainAmount = noise * (uniforms.grainIntensity / 100.0) * f32(uniforms.grainEnabled);
  color = vec4f(color.rgb + grainAmount, color.a);

  if (uniforms.phosphorEnabled == 1u) {
    let luminance = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
    let phosphorColor = vec3f(uniforms.phosphorColorR, uniforms.phosphorColorG, uniforms.phosphorColorB);
    color = vec4f(phosphorColor * luminance, color.a);
  }

  if (uniforms.vignetteEnabled == 1u) {
    let centered = uv - 0.5;
    let dist = length(centered) * 2.0;
    let vignette = 1.0 - smoothstep(uniforms.vignetteRadius, 1.0, dist) * uniforms.vignetteIntensity;
    color = vec4f(color.rgb * vignette, color.a);
  }

  let finalColor = select(color, vec4f(0.0, 0.0, 0.0, 1.0), outOfBounds);
  return clamp(finalColor, vec4f(0.0), vec4f(1.0));
}
`;

export class PostProcessEffect {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private options: PostProcessOptions;

  private sampler!: GPUSampler;
  private thresholdPipeline!: GPURenderPipeline;
  private blurPipeline!: GPURenderPipeline;
  private postProcessPipeline!: GPURenderPipeline;
  private thresholdBindGroupLayout!: GPUBindGroupLayout;
  private blurBindGroupLayout!: GPUBindGroupLayout;
  private postProcessBindGroupLayout!: GPUBindGroupLayout;

  private thresholdUniformBuffer!: GPUBuffer;
  private blurUniformBuffer!: GPUBuffer;
  private postProcessUniformBuffer!: GPUBuffer;

  private bloomThresholdTexture: GPUTexture | null = null;
  private bloomBlurHTarget: GPUTexture | null = null;
  private bloomBlurVTarget: GPUTexture | null = null;
  private dummyTexture: GPUTexture | null = null;
  private width: number = 0;
  private height: number = 0;
  private bloomTexturesCreated: boolean = false;

  constructor(device: GPUDevice, format: GPUTextureFormat, options: Partial<PostProcessOptions> = {}) {
    this.device = device;
    this.format = format;
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
    this.thresholdBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.blurBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.postProcessBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      ],
    });
  }

  private createPipelines() {
    const thresholdModule = this.device.createShaderModule({ code: THRESHOLD_SHADER });
    const blurModule = this.device.createShaderModule({ code: BLUR_SHADER });
    const postProcessModule = this.device.createShaderModule({ code: POST_PROCESS_SHADER });

    const createRenderPipeline = (module: GPUShaderModule, layout: GPUBindGroupLayout) =>
      this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        vertex: { module, entryPoint: 'vertexMain' },
        fragment: { module, entryPoint: 'fragmentMain', targets: [{ format: this.format }] },
        primitive: { topology: 'triangle-list' },
      });

    this.thresholdPipeline = createRenderPipeline(thresholdModule, this.thresholdBindGroupLayout);
    this.blurPipeline = createRenderPipeline(blurModule, this.blurBindGroupLayout);
    this.postProcessPipeline = createRenderPipeline(postProcessModule, this.postProcessBindGroupLayout);
  }

  private createBuffers() {
    this.thresholdUniformBuffer = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.blurUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.postProcessUniformBuffer = this.device.createBuffer({
      size: 112,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.dummyTexture = this.device.createTexture({
      label: 'Dummy Texture',
      size: { width: 1, height: 1 },
      format: this.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture: this.dummyTexture },
      new Uint8Array([0, 0, 0, 255]),
      { bytesPerRow: 4 },
      { width: 1, height: 1 }
    );
  }

  private ensureTextures(width: number, height: number, needBloom: boolean) {
    const sizeChanged = this.width !== width || this.height !== height;

    if (needBloom && (sizeChanged || !this.bloomTexturesCreated)) {
      this.bloomThresholdTexture?.destroy();
      this.bloomBlurHTarget?.destroy();
      this.bloomBlurVTarget?.destroy();

      const createTexture = (label: string) =>
        this.device.createTexture({
          label,
          size: { width, height },
          format: this.format,
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        });

      this.bloomThresholdTexture = createTexture('Bloom Threshold');
      this.bloomBlurHTarget = createTexture('Bloom Blur H');
      this.bloomBlurVTarget = createTexture('Bloom Blur V');
      this.bloomTexturesCreated = true;
    }

    this.width = width;
    this.height = height;
  }

  render(
    inputTexture: GPUTexture,
    outputView: GPUTextureView,
    width: number,
    height: number
  ) {
    const bloomEnabled = this.options.bloom.enabled && this.options.bloom.intensity > 0;

    this.ensureTextures(width, height, bloomEnabled);
    const encoder = this.device.createCommandEncoder();

    if (bloomEnabled) {
      this.renderBloomPass(encoder, inputTexture, width, height);
    }

    this.renderPostProcessPass(encoder, inputTexture, outputView, width, height, bloomEnabled);

    this.device.queue.submit([encoder.finish()]);
  }

  private renderBloomPass(
    encoder: GPUCommandEncoder,
    inputTexture: GPUTexture,
    width: number,
    height: number
  ) {
    this.device.queue.writeBuffer(
      this.thresholdUniformBuffer,
      0,
      new Float32Array([this.options.bloom.threshold, 0.1])
    );

    const thresholdBindGroup = this.device.createBindGroup({
      layout: this.thresholdBindGroupLayout,
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: inputTexture.createView() },
        { binding: 2, resource: { buffer: this.thresholdUniformBuffer } },
      ],
    });

    const thresholdPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.bloomThresholdTexture!.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    thresholdPass.setPipeline(this.thresholdPipeline);
    thresholdPass.setBindGroup(0, thresholdBindGroup);
    thresholdPass.draw(3);
    thresholdPass.end();

    this.device.queue.writeBuffer(
      this.blurUniformBuffer,
      0,
      new Float32Array([1, 0, width, height, this.options.bloom.radius])
    );

    const blurHBindGroup = this.device.createBindGroup({
      layout: this.blurBindGroupLayout,
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.bloomThresholdTexture!.createView() },
        { binding: 2, resource: { buffer: this.blurUniformBuffer } },
      ],
    });

    const blurHPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.bloomBlurHTarget!.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    blurHPass.setPipeline(this.blurPipeline);
    blurHPass.setBindGroup(0, blurHBindGroup);
    blurHPass.draw(3);
    blurHPass.end();

    this.device.queue.writeBuffer(
      this.blurUniformBuffer,
      0,
      new Float32Array([0, 1, width, height, this.options.bloom.radius])
    );

    const blurVBindGroup = this.device.createBindGroup({
      layout: this.blurBindGroupLayout,
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.bloomBlurHTarget!.createView() },
        { binding: 2, resource: { buffer: this.blurUniformBuffer } },
      ],
    });

    const blurVPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.bloomBlurVTarget!.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    blurVPass.setPipeline(this.blurPipeline);
    blurVPass.setBindGroup(0, blurVBindGroup);
    blurVPass.draw(3);
    blurVPass.end();
  }

  private renderPostProcessPass(
    encoder: GPUCommandEncoder,
    inputTexture: GPUTexture,
    outputView: GPUTextureView,
    width: number,
    height: number,
    bloomEnabled: boolean
  ) {
    const data = new Float32Array(28);
    data[0] = width;
    data[1] = height;
    data[2] = this.options.time;
    data[3] = bloomEnabled ? 1 : 0;
    data[4] = this.options.bloom.intensity;
    data[5] = this.options.grain.enabled ? 1 : 0;
    data[6] = this.options.grain.intensity;
    data[7] = this.options.grain.size;
    data[8] = this.options.grain.speed;
    data[9] = this.options.chromatic.enabled ? 1 : 0;
    data[10] = this.options.chromatic.offset;
    data[11] = this.options.scanlines.enabled ? 1 : 0;
    data[12] = this.options.scanlines.opacity;
    data[13] = this.options.scanlines.spacing;
    data[14] = this.options.vignette.enabled ? 1 : 0;
    data[15] = this.options.vignette.intensity;
    data[16] = this.options.vignette.radius;
    data[17] = this.options.crt.enabled ? 1 : 0;
    data[18] = this.options.crt.amount;
    data[19] = this.options.phosphor.enabled ? 1 : 0;
    data[20] = 0;
    data[21] = this.options.phosphor.color[0];
    data[22] = this.options.phosphor.color[1];
    data[23] = this.options.phosphor.color[2];
    data[24] = 0;

    this.device.queue.writeBuffer(this.postProcessUniformBuffer, 0, data);

    const bloomTexture = bloomEnabled && this.bloomBlurVTarget 
      ? this.bloomBlurVTarget 
      : this.dummyTexture!;

    const bindGroup = this.device.createBindGroup({
      layout: this.postProcessBindGroupLayout,
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: inputTexture.createView() },
        { binding: 2, resource: { buffer: this.postProcessUniformBuffer } },
        { binding: 3, resource: bloomTexture.createView() },
      ],
    });

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: outputView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(this.postProcessPipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
  }

  updateOptions(options: Partial<PostProcessOptions>) {
    this.options = { ...this.options, ...options };
  }

  destroy() {
    this.thresholdUniformBuffer.destroy();
    this.blurUniformBuffer.destroy();
    this.postProcessUniformBuffer.destroy();
    this.bloomThresholdTexture?.destroy();
    this.bloomBlurHTarget?.destroy();
    this.bloomBlurVTarget?.destroy();
    this.dummyTexture?.destroy();
  }
}
