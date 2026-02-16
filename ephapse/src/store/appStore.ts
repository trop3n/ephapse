import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EffectType, InputType } from '../types/webgpu';

// Panel visibility state
interface PanelState {
  input: boolean;
  effects: boolean;
  presets: boolean;
  settings: boolean;
  export: boolean;
}

// Settings sections visibility
interface SettingsSections {
  character: boolean;
  image: boolean;
  color: boolean;
  advanced: boolean;
  postProcessing: boolean;
}

// ASCII settings
interface CharacterSettings {
  charset: string;
  cellSize: number;
  spacing: number;
  brightnessMapping: number;
  invert: boolean;
}

// Image processing settings
interface ImageSettings {
  brightness: number;
  contrast: number;
  gamma: number;
  sharpness: number;
  blur: number;
  saturation: number;
  hue: number;
}

// Color settings
interface ColorSettings {
  mode: 'color' | 'grayscale' | 'monochrome' | 'sepia' | 'original';
  foregroundColor: [number, number, number];
  backgroundColor: [number, number, number];
  useOriginalColors: boolean;
}

// Advanced settings
interface AdvancedSettings {
  edgeEnhance: number;
  quantizeColors: number;
  spatialWeight: number;
  brightnessWeight: number;
  matchQuality: 'fast' | 'balanced' | 'quality';
}

// Post-processing settings
interface BloomSettings {
  enabled: boolean;
  intensity: number;
}

interface GrainSettings {
  enabled: boolean;
  intensity: number;
  size: number;
  speed: number;
}

interface ChromaticSettings {
  enabled: boolean;
  offset: number;
}

interface ScanlinesSettings {
  enabled: boolean;
  opacity: number;
  spacing: number;
}

interface VignetteSettings {
  enabled: boolean;
  intensity: number;
  radius: number;
}

interface CRTSettings {
  enabled: boolean;
  amount: number;
}

interface PhosphorSettings {
  enabled: boolean;
  color: [number, number, number];
}

interface PostProcessingSettings {
  bloom: BloomSettings;
  grain: GrainSettings;
  chromatic: ChromaticSettings;
  scanlines: ScanlinesSettings;
  vignette: VignetteSettings;
  crtCurve: CRTSettings;
  phosphor: PhosphorSettings;
}

// Effect-specific settings
interface EffectSettings {
  // Blockify
  blockifySize: number;
  blockifyStyle: number;
  blockifyBorderWidth: number;
  blockifyBorderColor: [number, number, number];
  blockifyGrayscale: boolean;
  
  // Threshold
  thresholdLevels: number;
  thresholdDither: boolean;
  thresholdPoint: number;
  thresholdInvert: boolean;
  thresholdForeground: [number, number, number];
  thresholdBackground: [number, number, number];
  thresholdPreserveColors: boolean;
  
  // Halftone
  halftoneSpacing: number;
  halftoneAngle: number;
  halftoneShape: number;
  halftoneInvert: boolean;
  halftoneColorMode: boolean;
  halftoneForeground: [number, number, number];
  halftoneBackground: [number, number, number];
  
  // Dots
  dotsSpacing: number;
  dotsSize: number;
  dotsShape: number;
  dotsGridType: number;
  dotsInvert: boolean;
  dotsColorMode: number;
  dotsForeground: [number, number, number];
  dotsBackground: [number, number, number];
  
  // Edge Detection
  edgeThreshold: number;
  edgeLineWidth: number;
  edgeAlgorithm: number;
  edgeInvert: boolean;
  edgeColorMode: boolean;
  edgeColor: [number, number, number];
  edgeBgColor: [number, number, number];
  
  // Crosshatch
  crosshatchDensity: number;
  crosshatchAngle: number;
  crosshatchLayers: number;
  crosshatchLineWidth: number;
  crosshatchInvert: boolean;
  crosshatchRandomness: number;
  crosshatchForeground: [number, number, number];
  crosshatchBackground: [number, number, number];
  
  // Wave Lines
  waveLinesCount: number;
  waveLinesAmplitude: number;
  waveLinesFrequency: number;
  waveLinesThickness: number;
  waveLinesDirection: number;
  waveLinesColorMode: number;
  waveLinesAnimate: boolean;
  waveLinesForeground: [number, number, number];
  waveLinesBackground: [number, number, number];
  
  // Noise Field
  noiseFieldScale: number;
  noiseFieldIntensity: number;
  noiseFieldSpeed: number;
  noiseFieldOctaves: number;
  noiseFieldType: number;
  noiseFieldDistortOnly: boolean;
  noiseFieldAnimate: boolean;
  
  // Dithering
  ditheringMethod: 'bayer2' | 'bayer4' | 'bayer8' | 'bayer16' | 'floydSteinberg' | 'atkinson' | 'ordered';
  colorLevels: number;
  
  // Matrix Rain
  rainSpeed: number;
  trailLength: number;
  rainColor: [number, number, number];
}

// Main store interface
interface AppState {
  // Input
  inputType: InputType | null;
  inputSource: HTMLImageElement | HTMLVideoElement | ImageBitmap | null;
  inputFile: File | null;
  inputWidth: number;
  inputHeight: number;
  isLoading: boolean;
  error: string | null;
  
  // Effects
  activeEffect: EffectType;
  effectSettings: EffectSettings;
  
  // Settings
  character: CharacterSettings;
  image: ImageSettings;
  color: ColorSettings;
  advanced: AdvancedSettings;
  postProcessing: PostProcessingSettings;
  
  // UI
  panels: PanelState;
  settingsSections: SettingsSections;
  sidebarCollapsed: boolean;
  zoom: number;
  isFullscreen: boolean;
  theme: 'dark' | 'light';
  
  // Actions
  setInput: (type: InputType | null, source: HTMLImageElement | HTMLVideoElement | ImageBitmap | null, width: number, height: number) => void;
  setInputFile: (file: File | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearInput: () => void;
  
  setActiveEffect: (effect: EffectType) => void;
  updateEffectSettings: (settings: Partial<EffectSettings>) => void;
  
  updateCharacter: (settings: Partial<CharacterSettings>) => void;
  updateImage: (settings: Partial<ImageSettings>) => void;
  updateColor: (settings: Partial<ColorSettings>) => void;
  updateAdvanced: (settings: Partial<AdvancedSettings>) => void;
  updatePostProcessing: (settings: Partial<PostProcessingSettings>) => void;
  
  togglePanel: (panel: keyof PanelState) => void;
  toggleSettingsSection: (section: keyof SettingsSections) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setZoom: (zoom: number) => void;
  toggleFullscreen: () => void;
  toggleTheme: () => void;
  
  resetSettings: () => void;
}

// Default settings
const defaultCharacterSettings: CharacterSettings = {
  charset: ' .:-=+*#%@',
  cellSize: 12,
  spacing: 0.1,
  brightnessMapping: 1,
  invert: false,
};

const defaultImageSettings: ImageSettings = {
  brightness: 0,
  contrast: 0,
  gamma: 1,
  sharpness: 0,
  blur: 0,
  saturation: 0,
  hue: 0,
};

const defaultColorSettings: ColorSettings = {
  mode: 'color',
  foregroundColor: [0, 1, 0], // Green
  backgroundColor: [0, 0, 0], // Black
  useOriginalColors: true,
};

const defaultAdvancedSettings: AdvancedSettings = {
  edgeEnhance: 0,
  quantizeColors: 0,
  spatialWeight: 0,
  brightnessWeight: 1.0,
  matchQuality: 'balanced',
};

const defaultPostProcessingSettings: PostProcessingSettings = {
  bloom: { enabled: false, intensity: 0.5 },
  grain: { enabled: false, intensity: 20, size: 1, speed: 1 },
  chromatic: { enabled: false, offset: 2 },
  scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
  vignette: { enabled: false, intensity: 0.5, radius: 0.7 },
  crtCurve: { enabled: false, amount: 0.1 },
  phosphor: { enabled: false, color: [0, 1, 0] },
};

const defaultEffectSettings: EffectSettings = {
  blockifySize: 8,
  blockifyStyle: 0,
  blockifyBorderWidth: 1,
  blockifyBorderColor: [1, 1, 1],
  blockifyGrayscale: false,
  thresholdLevels: 2,
  thresholdDither: false,
  thresholdPoint: 0.5,
  thresholdInvert: false,
  thresholdForeground: [1, 1, 1],
  thresholdBackground: [0, 0, 0],
  thresholdPreserveColors: false,
  halftoneSpacing: 6,
  halftoneAngle: 45,
  halftoneShape: 0,
  halftoneInvert: false,
  halftoneColorMode: false,
  halftoneForeground: [0, 0, 0],
  halftoneBackground: [1, 1, 1],
  dotsSpacing: 1,
  dotsSize: 1,
  dotsShape: 0,
  dotsGridType: 0,
  dotsInvert: false,
  dotsColorMode: 0,
  dotsForeground: [0, 0, 0],
  dotsBackground: [1, 1, 1],
  edgeThreshold: 0.15,
  edgeLineWidth: 1,
  edgeAlgorithm: 0,
  edgeInvert: false,
  edgeColorMode: false,
  edgeColor: [1, 1, 1],
  edgeBgColor: [0, 0, 0],
  crosshatchDensity: 6,
  crosshatchAngle: 45,
  crosshatchLayers: 4,
  crosshatchLineWidth: 0.15,
  crosshatchInvert: false,
  crosshatchRandomness: 0,
  crosshatchForeground: [0, 0, 0],
  crosshatchBackground: [1, 1, 1],
  waveLinesCount: 50,
  waveLinesAmplitude: 15,
  waveLinesFrequency: 1.5,
  waveLinesThickness: 0.5,
  waveLinesDirection: 0,
  waveLinesColorMode: 0,
  waveLinesAnimate: false,
  waveLinesForeground: [0, 0, 0],
  waveLinesBackground: [1, 1, 1],
  noiseFieldScale: 30,
  noiseFieldIntensity: 1.5,
  noiseFieldSpeed: 1,
  noiseFieldOctaves: 4,
  noiseFieldType: 0,
  noiseFieldDistortOnly: false,
  noiseFieldAnimate: false,
  ditheringMethod: 'bayer4',
  colorLevels: 2,
  rainSpeed: 1,
  trailLength: 15,
  rainColor: [0, 1, 0],
};

const defaultPanelState: PanelState = {
  input: true,
  effects: true,
  presets: false,
  settings: true,
  export: true,
};

const defaultSettingsSections: SettingsSections = {
  character: true,
  image: true,
  color: true,
  advanced: false,
  postProcessing: false,
};

// Create store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      inputType: null,
      inputSource: null,
      inputFile: null,
      inputWidth: 0,
      inputHeight: 0,
      isLoading: false,
      error: null,
      
      activeEffect: 'ascii',
      effectSettings: { ...defaultEffectSettings },
      
      character: { ...defaultCharacterSettings },
      image: { ...defaultImageSettings },
      color: { ...defaultColorSettings },
      advanced: { ...defaultAdvancedSettings },
      postProcessing: { ...defaultPostProcessingSettings },
      
      panels: { ...defaultPanelState },
      settingsSections: { ...defaultSettingsSections },
      sidebarCollapsed: false,
      zoom: 1,
      isFullscreen: false,
      theme: 'dark',
      
      // Actions
      setInput: (type, source, width, height) => 
        set({ inputType: type, inputSource: source, inputWidth: width, inputHeight: height, error: null }),
      
      setInputFile: (file) => set({ inputFile: file }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearInput: () => {
        const { inputSource } = get();
        if (inputSource instanceof HTMLVideoElement) {
          inputSource.pause();
          inputSource.srcObject = null;
        }
        set({
          inputType: null,
          inputSource: null,
          inputFile: null,
          inputWidth: 0,
          inputHeight: 0,
          error: null,
        });
      },
      
      setActiveEffect: (effect) => set({ activeEffect: effect }),
      
      updateEffectSettings: (settings) =>
        set((state) => ({
          effectSettings: { ...state.effectSettings, ...settings },
        })),
      
      updateCharacter: (settings) =>
        set((state) => ({
          character: { ...state.character, ...settings },
        })),
      
      updateImage: (settings) =>
        set((state) => ({
          image: { ...state.image, ...settings },
        })),
      
      updateColor: (settings) =>
        set((state) => ({
          color: { ...state.color, ...settings },
        })),
      
      updateAdvanced: (settings) =>
        set((state) => ({
          advanced: { ...state.advanced, ...settings },
        })),
      
      updatePostProcessing: (settings) =>
        set((state) => ({
          postProcessing: { ...state.postProcessing, ...settings },
        })),
      
      togglePanel: (panel) =>
        set((state) => ({
          panels: { ...state.panels, [panel]: !state.panels[panel] },
        })),
      
      toggleSettingsSection: (section) =>
        set((state) => ({
          settingsSections: { ...state.settingsSections, [section]: !state.settingsSections[section] },
        })),
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
      
      toggleFullscreen: () => {
        if (typeof document === 'undefined') return;
        
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
          set({ isFullscreen: true });
        } else {
          document.exitFullscreen?.();
          set({ isFullscreen: false });
        }
      },
      
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      resetSettings: () =>
        set({
          character: { ...defaultCharacterSettings },
          image: { ...defaultImageSettings },
          color: { ...defaultColorSettings },
          advanced: { ...defaultAdvancedSettings },
          postProcessing: { ...defaultPostProcessingSettings },
          effectSettings: { ...defaultEffectSettings },
        }),
    }),
    {
      name: 'psynapse-storage-v1',
      skipHydration: true,
      partialize: (state) => ({
        theme: state.theme,
        character: state.character,
        image: state.image,
        color: state.color,
        advanced: state.advanced,
        postProcessing: state.postProcessing,
        effectSettings: state.effectSettings,
        panels: state.panels,
        settingsSections: state.settingsSections,
      }),
    }
  )
);
