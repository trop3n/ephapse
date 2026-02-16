/// <reference types="@webgpu/types" />
import type { WebGPUSupported } from '../types/webgpu';

/**
 * Initialize WebGPU device and adapter
 */
export async function initWebGPU(): Promise<WebGPUSupported> {
  if (!navigator.gpu) {
    return { 
      supported: false, 
      reason: 'WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+' 
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      return { 
        supported: false, 
        reason: 'Could not get WebGPU adapter. Your GPU may not support WebGPU.' 
      };
    }

    // Check for required features
    const requiredFeatures: GPUFeatureName[] = [];
    
    const device = await adapter.requestDevice({
      requiredFeatures,
    });

    if (!device) {
      return { 
        supported: false, 
        reason: 'Could not create WebGPU device.' 
      };
    }

    // Handle device loss
    device.lost.then((info) => {
      console.error('WebGPU device lost:', info.reason, info.message);
    });

    return { supported: true, device, adapter, format: navigator.gpu.getPreferredCanvasFormat() };
  } catch (error) {
    return { 
      supported: false, 
      reason: `WebGPU initialization failed: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Setup canvas context for WebGPU rendering
 */
export function setupCanvasContext(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
  format: GPUTextureFormat
): GPUCanvasContext {
  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Failed to get webgpu context from canvas');
  }

  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  return context;
}

/**
 * Resize canvas to match display size with device pixel ratio
 */
export function resizeCanvas(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const rect = canvas.getBoundingClientRect();
  const displayWidth = Math.max(1, Math.floor(rect.width * dpr));
  const displayHeight = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    return true;
  }
  return false;
}

/**
 * Create a texture from an image source
 */
export async function createTextureFromImage(
  device: GPUDevice,
  source: HTMLImageElement | HTMLVideoElement | ImageBitmap,
  label?: string
): Promise<GPUTexture> {
  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  const texture = device.createTexture({
    label: label || 'Image Texture',
    size: { width, height },
    format: 'rgba8unorm',
    usage: 
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Copy image to texture
  device.queue.copyExternalImageToTexture(
    { source },
    { texture },
    { width, height }
  );

  return texture;
}

/**
 * Create a sampler with common configurations
 */
export function createSampler(
  device: GPUDevice,
  options: {
    magFilter?: GPUFilterMode;
    minFilter?: GPUFilterMode;
    addressModeU?: GPUAddressMode;
    addressModeV?: GPUAddressMode;
  } = {}
): GPUSampler {
  return device.createSampler({
    magFilter: options.magFilter ?? 'linear',
    minFilter: options.minFilter ?? 'linear',
    addressModeU: options.addressModeU ?? 'clamp-to-edge',
    addressModeV: options.addressModeV ?? 'clamp-to-edge',
  });
}

/**
 * Create uniform buffer with proper alignment
 */
export function createUniformBuffer(
  device: GPUDevice,
  size: number,
  label?: string
): GPUBuffer {
  return device.createBuffer({
    label: label || 'Uniform Buffer',
    size: Math.max(size, 256), // Minimum 256 bytes for uniform buffers
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
}

/**
 * Create a basic render pipeline
 */
export function createRenderPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule,
  bindGroupLayout: GPUBindGroupLayout,
  options: {
    vertexEntryPoint?: string;
    fragmentEntryPoint?: string;
    topology?: GPUPrimitiveTopology;
  } = {}
): GPURenderPipeline {
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  return device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: options.vertexEntryPoint ?? 'vertexMain',
    },
    fragment: {
      module: shaderModule,
      entryPoint: options.fragmentEntryPoint ?? 'fragmentMain',
      targets: [{ format }],
    },
    primitive: {
      topology: options.topology ?? 'triangle-list',
    },
  });
}

/**
 * Create bind group layout for common texture + uniform pattern
 */
export function createStandardBindGroupLayout(
  device: GPUDevice,
  label?: string
): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    label: label ?? 'Standard Bind Group Layout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      },
    ],
  });
}

/**
 * Create bind group for standard texture + uniform pattern
 */
export function createStandardBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  sampler: GPUSampler,
  texture: GPUTexture,
  uniformBuffer: GPUBuffer,
  label?: string
): GPUBindGroup {
  return device.createBindGroup({
    label: label ?? 'Standard Bind Group',
    layout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() },
      { binding: 2, resource: { buffer: uniformBuffer } },
    ],
  });
}

/**
 * Load image from file
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create ImageBitmap from file (better for WebGPU)
 */
export async function createImageBitmapFromFile(file: File): Promise<ImageBitmap> {
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  return createImageBitmap(blob);
}
