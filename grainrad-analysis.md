# Grainrad.com Deep Dive Analysis & Recreation Plan

## Website Overview
**URL:** https://grainrad.com  
**Creator:** Alim (@almmaasoglu on X/Twitter)  
**Tech Stack:** WebGPU, React, TypeScript, Vite, Tailwind CSS, Zustand  
**Description:** Free WebGPU-powered ASCII, dithering, and retro effects at 60fps

---

## 1. Architecture Overview

### Core Technologies
- **WebGPU API** - Primary rendering engine for all effects
- **React 18+** - UI framework with hooks
- **TypeScript** - Type safety
- **Vite** - Build tool with PWA support
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Three.js** - Optional 3D export functionality

### Project Structure
```
/src
  /components      # React UI components
  /shaders         # WGSL shader code
  /store           # Zustand state management
  /hooks           # Custom React hooks
  /utils           # Helper functions
  /types           # TypeScript definitions
  /effects         # Effect implementations
```

---

## 2. WebGPU Pipeline Architecture

### Device Initialization
```typescript
// WebGPU device setup with high-performance preference
const adapter = await navigator.gpu.requestAdapter({
  powerPreference: "high-performance"
});
const device = await adapter.requestDevice();
```

### Core Pipeline Types

#### A. ASCII Art Pipeline (Compute + Render)
**Two-pass system:**

1. **Compute Pass** - Character Matching
   - WGSL Compute Shader (`@compute @workgroup_size(8, 8)`)
   - Matches image regions to best-fit characters from font atlas
   - Outputs to storage buffer
   
2. **Render Pass** - Final Rendering
   - Full-screen triangle rendering
   - Samples from font atlas using match results
   - Applies color processing

**Key Uniforms (AsciiUniforms struct):**
```wgsl
struct AsciiUniforms {
  sourceSize: vec2f,        // Source image dimensions
  outputSize: vec2f,        // Output canvas dimensions  
  cellSize: vec2f,          // ASCII cell size in pixels
  atlasSize: vec2f,         // Font atlas dimensions
  atlasCharSize: vec2f,     // Character size in atlas
  atlasCols: f32,           // Atlas columns
  charsetLength: f32,       // Number of characters
  brightness: f32,          // -100 to 100
  contrast: f32,            // -100 to 100
  invert: f32,              // 0 or 1
  useOriginalColors: f32,   // 0 = custom, 1 = original
  customColorR: f32,        // Custom color RGB
  customColorG: f32,
  customColorB: f32,
  spacing: f32,             // Character gap
  saturation: f32,          // -100 to 100
  hue: f32,                 // 0 to 360
  sharpness: f32,           // 0 to 100
  gamma: f32,               // 0.1 to 3
  imageColorMode: f32,      // 0=color, 1=grayscale, 2=mono, 3=sepia
  gridCols: f32,            // For indexing
  backgroundColorR: f32,    // Background RGB
  backgroundColorG: f32,
  backgroundColorB: f32,
  brightnessMapping: f32,   // Gamma for mapping
  edgeEnhance: f32,         // Edge enhancement (0-100)
  blur: f32,                // Blur amount (0-10)
  quantizeColors: f32,      // Color quantization
}
```

#### B. Post-Processing Pipeline
```wgsl
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
  phosphorColorR: f32,
  phosphorColorG: f32,
  phosphorColorB: f32,
}
```

#### C. Individual Effect Pipelines
Each effect has its own shader:
- `DitheringUniforms` - Dithering algorithms
- `HalftoneUniforms` - Halftone dot patterns
- `EdgeUniforms` - Edge detection
- `DotsUniforms` - Dot patterns
- `BlockifyUniforms` - Block/pixelate effect
- `CrosshatchUniforms` - Crosshatch lines
- `WaveLinesUniforms` - Wave patterns
- `PixelSortUniforms` - Pixel sorting
- `ContourUniforms` - Contour lines
- `NoiseFieldUniforms` - Noise patterns
- `MatrixRainUniforms` - Matrix digital rain
- `VhsUniforms` - VHS tape effects
- `VoronoiUniforms` - Voronoi patterns

---

## 3. Shader Effects Deep Dive

### Dithering Algorithms
Implemented error-diffusion and ordered dithering:

```wgsl
// Error Diffusion (approximated)
fn floydSteinbergThreshold(pos: vec2f) -> f32
fn atkinsonThreshold(pos: vec2f) -> f32      // Higher contrast, less spread
fn jjnThreshold(pos: vec2f) -> f32           // Jarvis-Judice-Ninke
fn stuckiThreshold(pos: vec2f) -> f32        // Stucki
fn burkesThreshold(pos: vec2f) -> f32
fn sierraThreshold(pos: vec2f) -> f32
fn sierraTwoRowThreshold(pos: vec2f) -> f32
fn sierraLiteThreshold(pos: vec2f) -> f32

// Ordered Dithering - Bayer Matrices
fn bayer2(pos: vec2u) -> f32   // 2x2 matrix
fn bayer4(pos: vec2u) -> f32   // 4x4 matrix  
fn bayer8(pos: vec2u) -> f32   // 8x8 matrix
fn bayer16(pos: vec2u) -> f32  // 16x16 (recursive from 8x8)

// Blue Noise
fn blueNoiseApprox(pos: vec2f) -> f32
fn temporalBlueNoise(pos: vec2f, time: f32) -> f32
fn interleavedGradientNoise(pos: vec2f) -> f32
```

### Post-Processing Effects

#### Bloom Effect (Multi-pass)
1. Threshold pass - extract bright areas
2. Blur passes (horizontal + vertical Gaussian)
3. Composite - blend bloom with original

```wgsl
// Gaussian blur
fn gaussian(x: f32, sigma: f32) -> f32 {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}
```

#### Film Grain
```wgsl
let grainUV = floor(uv * uniforms.resolution / max(uniforms.grainSize, 1.0)) 
              * max(uniforms.grainSize, 1.0);
let noise = hash(grainUV + uniforms.time * uniforms.grainSpeed) - 0.5;
let grainAmount = noise * (uniforms.grainIntensity / 100.0);
```

#### Chromatic Aberration
```wgsl
let rShift = textureSample(inputTexture, texSampler, 
                         vec2f(uv.x - chromaticOffset, uv.y)).r;
let bShift = textureSample(inputTexture, texSampler, 
                         vec2f(uv.x + chromaticOffset, uv.y)).b;
```

#### CRT Effects
- Barrel distortion with `crtDistort()` function
- Scanlines with modulo math
- Phosphor color tinting

---

## 4. Color Processing Pipeline

### Image Processing Functions
```wgsl
fn rgbToHsl(c: vec3f) -> vec3f
fn hslToRgb(hsl: vec3f) -> vec3f
fn applyImageProcessing(color: vec3f, invGamma: f32, 
  brightnessOffset: f32, contrastFactor: f32, 
  satFactor: f32, colorMode: i32) -> vec3f
fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f
fn applyGamma(color: vec3f, gamma: f32) -> vec3f
fn applyQuantize(color: vec3f, levels: f32) -> vec3f
```

### Color Modes
- `0` - Color (full RGB)
- `1` - Grayscale
- `2` - Monochrome
- `3` - Sepia

---

## 5. State Management (Zustand)

### Store Structure
```typescript
interface AppState {
  input: {
    type: 'image' | 'video' | 'gif' | 'webcam' | '3d';
    source: HTMLImageElement | HTMLVideoElement | MediaStream | null;
    file: File | null;
    metadata: { width: number; height: number; duration?: number } | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
    gifData: GifData | null;
  };
  
  settings: {
    character: CharacterSettings;
    image: ImageSettings;
    color: ColorSettings;
    advanced: AdvancedSettings;
    postProcessing: PostProcessingSettings;
  };
  
  effects: {
    active: EffectType | null;
    settings: EffectSettingsMap;
  };
  
  presets: {
    activeId: string | null;
    custom: CustomPreset[];
  };
  
  export: {
    format: 'png' | 'jpg' | 'gif' | 'mp4' | 'webm' | 'glb';
    quality: number;
    fps: number;
    isExporting: boolean;
  };
  
  ui: {
    panels: PanelVisibility;
    settingsSections: SectionVisibility;
    zoom: number;
    sidebarCollapsed: boolean;
    theme: 'dark' | 'light';
    isFullscreen: boolean;
    isMobile: boolean;
  };
  
  videoCurrentTime: number;
  videoIsPlaying: boolean;
  isHydrated: boolean;
}
```

---

## 6. UI Components Architecture

### Panel Layout
```
┌─────────────────────────────────────────────────┐
│  Header (Logo, Theme Toggle, Fullscreen)        │
├──────────┬──────────────────────────┬───────────┤
│          │                          │           │
│  Input   │     Preview Canvas       │  Effects  │
│  Panel   │     (WebGPU Canvas)      │  Panel    │
│          │                          │           │
├──────────┴──────────────────────────┴───────────┤
│  Settings Panel (Collapsible Sections)          │
│  - Character Settings                           │
│  - Image Processing                             │
│  - Color Settings                               │
│  - Advanced Settings                            │
│  - Post-Processing                              │
├─────────────────────────────────────────────────┤
│  Export Panel (Format, Quality, Download)       │
└─────────────────────────────────────────────────┘
```

### Key UI Features
- **Theme System** - Dark/light mode with CSS variables
- **Responsive Design** - Mobile-optimized layout
- **Panel System** - Collapsible/expandable panels
- **Real-time Preview** - 60fps live updates
- **Preset System** - Save/load custom configurations

---

## 7. Supported Input Types

| Type | Formats | Processing |
|------|---------|------------|
| Images | PNG, JPG, WebP, GIF | Direct texture upload |
| Video | MP4, WebM, MOV, AVI | Frame-by-frame processing |
| GIF | Animated GIF | Frame extraction |
| Webcam | MediaStream | Real-time capture |
| 3D | GLB, GLTF | Three.js integration |

---

## 8. Export Capabilities

### Static Exports
- **PNG** - Lossless with transparency
- **JPG** - Compressed, quality adjustable

### Animated Exports
- **GIF** - Animated GIF generation
- **MP4** - H.264 video encoding
- **WebM** - VP8/VP9 video encoding

### 3D Exports
- **GLB** - 3D model with ASCII texture (Three.js)

---

## 9. Recreation Plan

### Phase 1: Foundation (Week 1)
1. **Project Setup**
   ```bash
   npm create vite@latest grainrad-clone -- --template react-ts
   cd grainrad-clone
   npm install zustand tailwindcss @types/node
   npm install -D @webgpu/types
   ```

2. **WebGPU Infrastructure**
   - Device initialization with fallback handling
   - Canvas context setup
   - Texture upload utilities
   - Pipeline creation helpers

3. **Basic React Structure**
   - App shell with panels
   - Zustand store setup
   - Theme provider

### Phase 2: Core Effects (Week 2-3)
1. **Shader Library**
   - Vertex shader (full-screen triangle)
   - Basic fragment shaders
   - Compute shader infrastructure

2. **ASCII Effect** (Priority 1)
   - Font atlas generation
   - Character matching compute shader
   - Rendering fragment shader
   - CPU-side character matching (for 3D export)

3. **Basic Post-Processing**
   - Bloom (threshold + blur + composite)
   - Film grain
   - Vignette
   - Scanlines

### Phase 3: Additional Effects (Week 4-5)
1. **Dithering Effects**
   - Bayer matrices (2x2, 4x4, 8x8, 16x16)
   - Error diffusion approximations
   - Blue noise

2. **Artistic Effects**
   - Halftone dots
   - Edge detection
   - Crosshatch
   - Blockify
   - Contour
   - Pixel sort
   - Wave lines
   - Noise field
   - Matrix rain
   - VHS
   - Voronoi

### Phase 4: UI Polish (Week 6)
1. **Settings Panels**
   - Sliders with real-time updates
   - Color pickers
   - Dropdown selectors
   - Toggle switches

2. **Input Handling**
   - Drag & drop
   - File picker
   - Webcam access
   - Video playback

3. **Export System**
   - Canvas-to-image download
   - Video recording (MediaRecorder)
   - GIF encoding

### Phase 5: Advanced Features (Week 7-8)
1. **Preset System**
   - Save/load to localStorage
   - Import/export JSON

2. **3D Export**
   - Three.js integration
   - ASCII text geometry

3. **Performance Optimization**
   - Shader precompilation
   - Texture pooling
   - Workgroup size optimization

---

## 10. Key Technical Challenges

### Challenge 1: WebGPU Compatibility
**Solution:** Feature detection with graceful degradation
```typescript
if (!navigator.gpu) {
  return <WebGPUNotSupported />;
}
```

### Challenge 2: Font Atlas Generation
**Solution:** Canvas 2D API to generate SDF or bitmap atlas
```typescript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// Render character set to canvas
// Upload to WebGPU texture
```

### Challenge 3: Video Processing Performance
**Solution:** Frame skipping for preview, full frame for export
```typescript
if (isPreview && frameCount % 2 !== 0) return; // 30fps preview
```

### Challenge 4: Mobile Performance
**Solution:** Adaptive quality based on device tier
```typescript
const tier = getDeviceTier(); // low, medium, high
const workgroupSize = tier === 'low' ? 4 : 8;
```

---

## 11. Shader Code Templates

### Full-Screen Triangle Vertex Shader
```wgsl
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
};

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
```

### Basic Fragment Shader Structure
```wgsl
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: MyUniforms;

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let color = textureSample(inputTexture, texSampler, texCoord);
  // ... effect processing ...
  return vec4f(finalColor, 1.0);
}
```

### Compute Shader Template
```wgsl
@group(0) @binding(0) var sourceSampler: sampler;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;
@group(0) @binding(3) var<uniform> uniforms: ComputeUniforms;

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let coords = vec2u(global_id.xy);
  // ... compute logic ...
  output[index] = result;
}
```

---

## 12. Performance Considerations

### Optimizations Implemented in Original
1. **Precomputed Constants** - Avoid division in hot paths
   ```wgsl
   const INV_200: f32 = 0.005;
   const INV_100: f32 = 0.01;
   ```

2. **Branchless Code** - Use `select()` instead of `if`
   ```wgsl
   let uv = select(texCoord, distortedUV, crtActive);
   ```

3. **Saturate Instead of Clamp** - For 0-1 range
   ```wgsl
   let clamped = saturate(value);
   ```

4. **Texture Lod Bias** - For mipmapped sampling

5. **Workgroup Size** - 8x8 for optimal occupancy

---

## 13. References & Resources

### Similar Projects
- grained.js - CSS-based grain effect
- Three.js FilmPass - Film grain post-processing
- GPUCompute.js - WebGPU compute examples

### Learning Resources
- WebGPU Fundamentals (webgpufundamentals.org)
- WGSL Specification
- React + WebGPU integration patterns

### Tools
- WGSL Formatter
- WebGPU Inspector (Chrome DevTools)
- Spector.js (WebGL/WebGPU debugging)

---

## Summary

Grainrad.com is a sophisticated WebGPU application that demonstrates:
- Advanced compute shader usage for ASCII art
- Comprehensive post-processing pipeline
- Multiple dithering algorithms
- Real-time video processing
- Professional UI/UX with React

The recreation would require:
1. Strong WebGPU/WGSL knowledge
2. React/TypeScript proficiency
3. Understanding of image processing algorithms
4. Performance optimization skills
5. UI/UX design sensibility

**Estimated effort:** 6-8 weeks for a single developer with WebGPU experience.
