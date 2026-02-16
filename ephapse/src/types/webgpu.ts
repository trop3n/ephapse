/// <reference types="@webgpu/types" />

// WebGPU types and interfaces
// Note: WebGPUContext is defined when needed in components

export interface WebGPUDeviceInfo {
  isSupported: boolean;
  error?: string;
  adapter?: GPUAdapter;
  device?: GPUDevice;
  features: GPUFeatureName[];
  limits: GPUSupportedLimits | null;
}

export type WebGPUSupported = 
  | { supported: true; device: GPUDevice; adapter: GPUAdapter; format: GPUTextureFormat }
  | { supported: false; reason: string };

// Common uniform buffer layouts
export interface BaseUniforms {
  resolution: [number, number];
  time: number;
}

// Effect types
export type EffectType = 
  | 'ascii'
  | 'dithering'
  | 'halftone'
  | 'matrixRain'
  | 'dots'
  | 'contour'
  | 'blur'
  | 'pixelSort'
  | 'blockify'
  | 'threshold'
  | 'edgeDetection'
  | 'crosshatch'
  | 'waveLines'
  | 'noiseField'
  | 'vhs'
  | 'voronoi'
  | null;

// Input types
export type InputType = 'image' | 'video' | 'gif' | 'webcam';

export interface InputState {
  type: InputType | null;
  source: HTMLImageElement | HTMLVideoElement | ImageBitmap | null;
  file: File | null;
  width: number;
  height: number;
}
