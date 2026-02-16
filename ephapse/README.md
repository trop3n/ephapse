# psynapse

A WebGPU-powered ASCII art and effects generator. Inspired by grainrad.com.

## Phase 1 Complete ✅

### What's Been Built

#### 1. Project Foundation
- **Vite + React + TypeScript** - Modern build setup
- **Tailwind CSS** - Utility-first styling with CSS variables for theming
- **Zustand** - State management with persistence
- **WebGPU Types** - TypeScript definitions for WebGPU API

#### 2. WebGPU Infrastructure (`src/utils/webgpu.ts`)
- `initWebGPU()` - Device initialization with fallback handling
- `setupCanvasContext()` - Canvas context configuration
- `resizeCanvas()` - DPR-aware canvas sizing
- `createTextureFromImage()` - Image/Video/ImageBitmap to GPUTexture
- `createSampler()` - Sampler creation with options
- `createUniformBuffer()` - Aligned uniform buffer creation
- `createRenderPipeline()` - Pipeline factory
- `createStandardBindGroupLayout()` - Common bind group layout
- `createStandardBindGroup()` - Bind group factory
- `createImageBitmapFromFile()` - File loading utility

#### 3. State Management (`src/store/appStore.ts`)
Full Zustand store with persistence:

**Input State:**
- Image/Video/GIF/Webcam input types
- File handling
- Error management

**Settings State:**
- Character settings (charset, cell size, spacing, brightness mapping)
- Image processing (brightness, contrast, gamma, saturation, hue, sharpness, blur)
- Color settings (mode, foreground/background colors)
- Advanced settings (edge enhance, quantization, spatial weight, match quality)
- Post-processing (bloom, grain, chromatic, scanlines, vignette, CRT, phosphor)

**Effect State:**
- 15+ effect types
- Effect-specific parameters

**UI State:**
- Panel visibility (input, effects, presets, settings, export)
- Settings section expansion
- Theme (dark/light)
- Zoom level
- Fullscreen state

#### 4. React Components

**Header (`src/components/Header.tsx`)**
- Logo and branding
- Theme toggle (dark/light)
- Fullscreen toggle
- GitHub link
- Info button

**Input Panel (`src/components/InputPanel.tsx`)**
- Drag & drop zone with visual feedback
- File picker
- Image dimensions display
- Error display
- Loading states
- Clear input button

**Effects Panel (`src/components/EffectsPanel.tsx`)**
- All 15 effects listed
- Active effect highlighting
- Collapsible

**Settings Panel (`src/components/SettingsPanel.tsx`)**
- Collapsible sections
- Sliders with value display
- Checkboxes for toggles
- Dropdown selects
- Reset all button

**Preview (`src/components/Preview.tsx`)**
- WebGPU canvas integration
- Zoom controls (25% - 300%)
- Status bar with dimensions
- Empty state

**Theme System (`src/hooks/useTheme.ts`)**
- CSS variable-based theming
- Dark/light mode support
- Automatic system preference detection

#### 5. Styling (`src/index.css`)
- CSS custom properties for theming
- Custom scrollbar styling
- Range input styling
- Button base styles
- Tailwind integration

## Project Structure

```
src/
├── components/
│   ├── Header.tsx          # App header with controls
│   ├── InputPanel.tsx      # File input & drag-drop
│   ├── EffectsPanel.tsx    # Effect selection
│   ├── SettingsPanel.tsx   # Settings controls
│   └── Preview.tsx         # WebGPU canvas
├── hooks/
│   └── useTheme.ts         # Theme management
├── store/
│   └── appStore.ts         # Zustand state
├── types/
│   └── webgpu.ts           # TypeScript types
├── utils/
│   └── webgpu.ts           # WebGPU utilities
├── shaders/                # WGSL shaders
├── App.tsx                 # Main app
├── index.css               # Global styles
└── main.tsx                # Entry point
```

## Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## WebGPU Support

This project requires a browser with WebGPU support:
- Chrome 113+
- Edge 113+
- Firefox (behind flag)
- Safari (not yet supported)

## Next Steps (Phase 2)

1. **ASCII Effect Implementation**
   - Font atlas generator
   - Compute shader for character matching
   - Connect to preview canvas

2. **Post-Processing Pipeline**
   - Bloom (threshold + blur + composite)
   - Film grain
   - Vignette
   - Scanlines

3. **Additional Effects**
   - Implement all 15 effects from shaders

## Credits

Research reference: https://grainrad.com  
Original creator: Alim (@almmaasoglu)

This is an educational project exploring WebGPU effects.
