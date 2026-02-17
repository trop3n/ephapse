# psynapse

A WebGPU-powered ASCII art and effects generator. Inspired by grainrad.com.

## Features

### 16 Real-time Effects
All effects are GPU-accelerated using WebGPU shaders:

| Effect | Description |
|--------|-------------|
| **ASCII Art** | Convert images to text characters with font atlas |
| **Dithering** | Classic error diffusion patterns (Floyd-Steinberg, etc.) |
| **Halftone** | Newspaper-style dot patterns |
| **Dots** | Geometric dot grid patterns |
| **Blockify** | Pixelation/mosaic effect |
| **Threshold** | Binary posterization |
| **Edge Detection** | Sobel/Laplacian outlines |
| **Crosshatch** | Engraving-style line patterns |
| **Wave Lines** | Animated sine wave patterns |
| **Noise Field** | Flowing Perlin noise distortion |
| **VHS** | Retro VHS tape effects |
| **Pixel Sort** | Glitch-style pixel sorting |
| **Blur** | Gaussian blur |
| **Contour** | Topographic line visualization |
| **Voronoi** | Cellular patterns |
| **Matrix Rain** | Digital rain animation |

### Post-Processing Pipeline
Apply retro CRT effects to any output:
- Bloom
- Film grain (animated)
- Chromatic aberration
- Scanlines
- Vignette
- CRT curve distortion
- Phosphor glow

### UI Features
- Drag & drop image input
- Dark/light theme
- Zoom controls (25%-300%)
- Fullscreen mode
- Persistent settings

## Project Structure

```
src/
├── components/
│   ├── Preview.tsx         # WebGPU render loop
│   ├── SettingsPanel.tsx   # Effect controls
│   ├── EffectsPanel.tsx    # Effect selection
│   ├── InputPanel.tsx      # File input
│   └── Header.tsx          # App controls
├── effects/                 # Effect classes
├── shaders/                 # WGSL shaders
├── store/
│   └── appStore.ts         # Zustand state
├── utils/
│   ├── webgpu.ts           # WebGPU utilities
│   └── fontAtlas.ts        # ASCII font atlas
└── types/
    └── webgpu.ts           # TypeScript types
```

## Running the Project

```bash
cd ephapse

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## WebGPU Support

This project requires a browser with WebGPU support:
- Chrome 113+
- Edge 113+
- Firefox (behind flag)
- Safari (not yet supported)

## Credits

Research reference: https://grainrad.com  
Original creator: Alim (@almmaasoglu)

This is an educational project exploring WebGPU effects.
