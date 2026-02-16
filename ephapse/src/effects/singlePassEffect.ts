/**
 * Generic Single-Pass Effect Base Class
 * Handles common WebGPU setup for effects that use a single render pass
 */

export interface SinglePassOptions {
  resolution: [number, number];
  brightness: number;
  contrast: number;
}

const DEFAULT_OPTIONS: SinglePassOptions = {
  resolution: [0, 0],
  brightness: 0,
  contrast: 0,
};

const VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

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
`;

export abstract class SinglePassEffect<TOptions extends SinglePassOptions> {
  protected device: GPUDevice;
  protected format: GPUTextureFormat;
  protected options: TOptions;
  
  protected pipeline!: GPURenderPipeline;
  protected bindGroupLayout!: GPUBindGroupLayout;
  protected uniformBuffer!: GPUBuffer;
  protected sampler!: GPUSampler;
  
  protected abstract getFragmentShader(): string;
  protected abstract getUniformBufferSize(): number;
  protected abstract writeUniforms(): void;
  
  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    defaultOptions: TOptions
  ) {
    this.device = device;
    this.format = format;
    this.options = { ...DEFAULT_OPTIONS, ...defaultOptions } as TOptions;
    
    this.init();
  }
  
  private init() {
    this.createSampler();
    this.createBindGroupLayout();
    this.createPipeline();
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
  
  private createBindGroupLayout() {
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });
  }
  
  private createPipeline() {
    const shaderModule = this.device.createShaderModule({
      code: VERTEX_SHADER + '\n' + this.getFragmentShader(),
    });
    
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });
    
    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: shaderModule, entryPoint: 'vertexMain' },
      fragment: { module: shaderModule, entryPoint: 'fragmentMain', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    });
  }
  
  private createBuffers() {
    this.uniformBuffer = this.device.createBuffer({
      size: this.getUniformBufferSize(),
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }
  
  render(inputTexture: GPUTexture, outputView: GPUTextureView, width: number, height: number): void {
    this.options.resolution = [width, height];
    this.writeUniforms();
    
    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: inputTexture.createView() },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
      ],
    });
    
    const encoder = this.device.createCommandEncoder();
    
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: outputView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    
    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(3);
    renderPass.end();
    
    this.device.queue.submit([encoder.finish()]);
  }
  
  updateOptions(options: Partial<TOptions>) {
    this.options = { ...this.options, ...options };
  }
  
  destroy() {
    this.uniformBuffer.destroy();
  }
}
