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

  LS = `
${ta}

struct DitheringUniforms {
  resolution: vec2f,         // 0: Screen resolution
  intensity: f32,            // 8: Overall effect intensity / grid size multiplier
  colorLevels: f32,          // 12: Number of color levels for quantization

  method: f32,               // 16: Dithering method ID
  matrixSize: f32,           // 20: Matrix size for ordered dithering
  brightness: f32,           // 24: Brightness adjustment
  contrast: f32,             // 28: Contrast adjustment

  colorMode: f32,            // 32: Color mode (0=mono, 1=tonal, 2=indexed, 3=rgb)
  gamma: f32,                // 36: Gamma correction
  sharpen: f32,              // 40: Sharpen/blur (-1 to 1)
  dotSize: f32,              // 44: Halftone dot size

  angle: f32,                // 48: Halftone angle in degrees
  lineWeight: f32,           // 52: Line weight for crosshatch/engraving
  lineSpacing: f32,          // 56: Line spacing
  layers: f32,               // 60: Number of crosshatch layers

  modEnabled: f32,           // 64: Modulation enabled (0 or 1)
  modType: f32,              // 68: Modulation type (0=wave, 1=grid, 2=horizontal, 3=radial)
  modFreq: f32,              // 72: Modulation frequency
  modAmp: f32,               // 76: Modulation amplitude

  modPhase: f32,             // 80: Modulation phase
  bleed: f32,                // 84: Color bleed amount
  rounding: f32,             // 88: Edge rounding/softening
  paletteSize: f32,          // 92: Number of colors in palette

  fgColorR: f32,             // 96: Foreground color R
  fgColorG: f32,             // 100: Foreground color G
  fgColorB: f32,             // 104: Foreground color B
  bgColorR: f32,             // 108: Background color R

  bgColorG: f32,             // 112: Background color G
  bgColorB: f32,             // 116: Background color B
  cmykAngleC: f32,           // 120: CMYK cyan angle
  cmykAngleM: f32,           // 124: CMYK magenta angle

  cmykAngleY: f32,           // 128: CMYK yellow angle
  cmykAngleK: f32,           // 132: CMYK black angle
  time: f32,                 // 136: Time for animation
  brightnessMapping: f32,    // 140: Brightness mapping (gamma for luminance)

  edgeEnhance: f32,          // 144: Edge enhancement strength (0-100)
  blur: f32,                 // 148: Blur amount (0-10)
  quantizeColors: f32,       // 152: Color quantization levels (0=disabled)
  _pad: f32,                 // 156: Padding

  // Palette colors (16 colors max, vec4 for alignment) - starts at byte 160
  palette0: vec4f,           // 160: Palette color 0 (RGB + unused)
  palette1: vec4f,           // 176: Palette color 1
  palette2: vec4f,           // 192: Palette color 2
  palette3: vec4f,           // 208: Palette color 3
  palette4: vec4f,           // 224: Palette color 4
  palette5: vec4f,           // 240: Palette color 5
  palette6: vec4f,           // 256: Palette color 6
  palette7: vec4f,           // 272: Palette color 7
  palette8: vec4f,           // 288: Palette color 8
  palette9: vec4f,           // 304: Palette color 9
  palette10: vec4f,          // 320: Palette color 10
  palette11: vec4f,          // 336: Palette color 11
  palette12: vec4f,          // 352: Palette color 12
  palette13: vec4f,          // 368: Palette color 13
  palette14: vec4f,          // 384: Palette color 14
  palette15: vec4f,          // 400: Palette color 15

  // Epsilon Glow settings (416-455)
  epsilonGlowEnabled: f32,   // 416: Epsilon glow enabled
  epsilonThreshold: f32,     // 420: Threshold for glow
  epsilonThresholdSmooth: f32, // 424: Threshold smoothing
  epsilonRadius: f32,        // 428: Glow radius

  epsilonIntensity: f32,     // 432: Glow intensity
  epsilonAspectRatio: f32,   // 436: Aspect ratio
  epsilonDirection: f32,     // 440: Direction in degrees
  epsilonFalloff: f32,       // 444: Falloff exponent

  epsilonEpsilon: f32,       // 448: Epsilon value
  epsilonDistanceScale: f32, // 452: Distance scale

  // JPEG Glitch settings (456-479)
  jpegBlockShift: f32,       // 456: Block shift amount
  jpegBlockShiftEnabled: f32, // 460: Block shift enabled
  jpegChannelSwap: f32,      // 464: Channel swap amount
  jpegChannelSwapEnabled: f32, // 468: Channel swap enabled

  jpegScanlineOffset: f32,   // 472: Scanline offset
  jpegScanlineEnabled: f32,  // 476: Scanline offset enabled
  jpegBlockScramble: f32,    // 480: Block scramble amount
  jpegBlockScrambleEnabled: f32, // 484: Block scramble enabled

  jpegInterlace: f32,        // 488: Interlace corruption
  jpegInterlaceEnabled: f32, // 492: Interlace enabled

  // Chromatic effect settings (496-511)
  chromaticEnabled: f32,     // 496: Chromatic enabled
  chromaticMaxDisplace: f32, // 500: Max displacement
  chromaticRed: f32,         // 504: Red channel offset
  chromaticGreen: f32,       // 508: Green channel offset

  chromaticBlue: f32,        // 512: Blue channel offset
  _pad2: f32,                // 516: Padding
  _pad3: f32,                // 520: Padding
  _pad4: f32,                // 524: Padding
  // Total size: 528 bytes (must be multiple of 16)
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: DitheringUniforms;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const PI: f32 = 3.14159265359;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

// Compute adaptive darkness that spreads out values better for dark images
// Uses the brightnessMapping uniform as a gamma curve
// Values < 1 = expand dark range (good for dark images)
// Values > 1 = expand bright range (good for bright images)
fn getAdaptiveDarkness(lum: f32, gamma: f32) -> f32 {
  // Apply gamma to luminance first to spread out values
  let adjustedLum = pow(max(lum, 0.001), gamma);
  return 1.0 - adjustedLum;
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn applyGamma(color: vec3f, gamma: f32) -> vec3f {
  if (gamma == 1.0) { return color; }
  let g = 1.0 / max(gamma, 0.01);
  return pow(max(color, vec3f(0.001)), vec3f(g));
}

fn rotate2D(p: vec2f, angle: f32) -> vec2f {
  let s = sin(angle);
  let c = cos(angle);
  return vec2f(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Simple hash for procedural noise
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

fn hash2(p: vec2f) -> vec2f {
  return vec2f(
    fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2f(269.5, 183.3))) * 43758.5453)
  );
}

// ============================================================================
// PROCESSING FUNCTIONS (Blur, Edge Enhance, Quantize)
// ============================================================================

// 3x3 Gaussian blur
fn applyBlur(uv: vec2f, amount: f32) -> vec3f {
  if (amount < 0.01) {
    return textureSample(inputTexture, texSampler, uv).rgb;
  }

  let texelSize = 1.0 / uniforms.resolution;
  let blurSize = amount * texelSize;

  // 3x3 Gaussian kernel weights
  let w0 = 0.0625; // corners
  let w1 = 0.125;  // edges
  let w2 = 0.25;   // center

  var color = vec3f(0.0);
  color += textureSample(inputTexture, texSampler, uv + vec2f(-1.0, -1.0) * blurSize).rgb * w0;
  color += textureSample(inputTexture, texSampler, uv + vec2f( 0.0, -1.0) * blurSize).rgb * w1;
  color += textureSample(inputTexture, texSampler, uv + vec2f( 1.0, -1.0) * blurSize).rgb * w0;
  color += textureSample(inputTexture, texSampler, uv + vec2f(-1.0,  0.0) * blurSize).rgb * w1;
  color += textureSample(inputTexture, texSampler, uv).rgb * w2;
  color += textureSample(inputTexture, texSampler, uv + vec2f( 1.0,  0.0) * blurSize).rgb * w1;
  color += textureSample(inputTexture, texSampler, uv + vec2f(-1.0,  1.0) * blurSize).rgb * w0;
  color += textureSample(inputTexture, texSampler, uv + vec2f( 0.0,  1.0) * blurSize).rgb * w1;
  color += textureSample(inputTexture, texSampler, uv + vec2f( 1.0,  1.0) * blurSize).rgb * w0;

  return color;
}

// Sobel edge detection
fn detectEdges(uv: vec2f) -> f32 {
  let texelSize = 1.0 / uniforms.resolution;

  // Sample 3x3 neighborhood luminances
  let tl = luminance(textureSample(inputTexture, texSampler, uv + vec2f(-1.0, -1.0) * texelSize).rgb);
  let tc = luminance(textureSample(inputTexture, texSampler, uv + vec2f( 0.0, -1.0) * texelSize).rgb);
  let tr = luminance(textureSample(inputTexture, texSampler, uv + vec2f( 1.0, -1.0) * texelSize).rgb);
  let ml = luminance(textureSample(inputTexture, texSampler, uv + vec2f(-1.0,  0.0) * texelSize).rgb);
  let mr = luminance(textureSample(inputTexture, texSampler, uv + vec2f( 1.0,  0.0) * texelSize).rgb);
  let bl = luminance(textureSample(inputTexture, texSampler, uv + vec2f(-1.0,  1.0) * texelSize).rgb);
  let bc = luminance(textureSample(inputTexture, texSampler, uv + vec2f( 0.0,  1.0) * texelSize).rgb);
  let br = luminance(textureSample(inputTexture, texSampler, uv + vec2f( 1.0,  1.0) * texelSize).rgb);

  // Sobel operators
  let gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
  let gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;

  return sqrt(gx*gx + gy*gy);
}

// Apply edge enhancement to color
fn applyEdgeEnhance(color: vec3f, uv: vec2f, amount: f32) -> vec3f {
  if (amount < 0.01) { return color; }

  let edge = detectEdges(uv);
  let edgeAmount = amount / 100.0;

  // Darken edges (subtract edge from color)
  return clamp(color - vec3f(edge * edgeAmount), vec3f(0.0), vec3f(1.0));
}

// Apply color quantization
fn applyQuantize(color: vec3f, levels: f32) -> vec3f {
  if (levels < 2.0) { return color; }

  let l = levels - 1.0;
  return floor(color * l + 0.5) / l;
}

// Apply sharpening (unsharp mask style) - works as pre-processing
fn applySharpen(color: vec3f, uv: vec2f, amount: f32) -> vec3f {
  if (abs(amount) < 0.01) { return color; }

  let texelSize = 1.0 / uniforms.resolution;

  // Sample neighbors for Laplacian
  let n = textureSample(inputTexture, texSampler, uv + vec2f(0.0, -1.0) * texelSize).rgb;
  let s = textureSample(inputTexture, texSampler, uv + vec2f(0.0, 1.0) * texelSize).rgb;
  let e = textureSample(inputTexture, texSampler, uv + vec2f(1.0, 0.0) * texelSize).rgb;
  let w = textureSample(inputTexture, texSampler, uv + vec2f(-1.0, 0.0) * texelSize).rgb;

  // Laplacian = center * 4 - neighbors
  let laplacian = color * 4.0 - n - s - e - w;

  // Positive amount = sharpen, negative = soften
  return clamp(color + laplacian * amount * 0.5, vec3f(0.0), vec3f(1.0));
}

// ============================================================================
// PALETTE FUNCTIONS
// ============================================================================

// Get palette color by index (0-15)
fn getPaletteColor(idx: u32) -> vec3f {
  switch (idx) {
    case 0u: { return uniforms.palette0.rgb; }
    case 1u: { return uniforms.palette1.rgb; }
    case 2u: { return uniforms.palette2.rgb; }
    case 3u: { return uniforms.palette3.rgb; }
    case 4u: { return uniforms.palette4.rgb; }
    case 5u: { return uniforms.palette5.rgb; }
    case 6u: { return uniforms.palette6.rgb; }
    case 7u: { return uniforms.palette7.rgb; }
    case 8u: { return uniforms.palette8.rgb; }
    case 9u: { return uniforms.palette9.rgb; }
    case 10u: { return uniforms.palette10.rgb; }
    case 11u: { return uniforms.palette11.rgb; }
    case 12u: { return uniforms.palette12.rgb; }
    case 13u: { return uniforms.palette13.rgb; }
    case 14u: { return uniforms.palette14.rgb; }
    case 15u: { return uniforms.palette15.rgb; }
    default: { return vec3f(0.0); }
  }
}

// Find nearest palette color using Euclidean distance in RGB space
fn findNearestPaletteColor(color: vec3f, paletteSize: u32) -> vec3f {
  var bestColor = getPaletteColor(0u);
  var bestDist = 999999.0;

  let size = min(paletteSize, 16u);
  for (var i = 0u; i < size; i = i + 1u) {
    let palColor = getPaletteColor(i);
    let diff = color - palColor;
    let dist = dot(diff, diff); // squared distance
    if (dist < bestDist) {
      bestDist = dist;
      bestColor = palColor;
    }
  }

  return bestColor;
}

// Find two nearest palette colors for dithering between them
fn findTwoNearestPaletteColors(color: vec3f, paletteSize: u32) -> array<vec3f, 2> {
  var best1 = getPaletteColor(0u);
  var best2 = getPaletteColor(1u);
  var dist1 = 999999.0;
  var dist2 = 999999.0;

  let size = min(paletteSize, 16u);
  for (var i = 0u; i < size; i = i + 1u) {
    let palColor = getPaletteColor(i);
    let diff = color - palColor;
    let dist = dot(diff, diff);

    if (dist < dist1) {
      dist2 = dist1;
      best2 = best1;
      dist1 = dist;
      best1 = palColor;
    } else if (dist < dist2) {
      dist2 = dist;
      best2 = palColor;
    }
  }

  return array<vec3f, 2>(best1, best2);
}

// Dither between two palette colors based on threshold
fn ditherPaletteColor(color: vec3f, threshold: f32, paletteSize: u32) -> vec3f {
  let nearest = findTwoNearestPaletteColors(color, paletteSize);
  let color1 = nearest[0];
  let color2 = nearest[1];

  // Calculate blend factor based on distance to both colors
  let diff1 = color - color1;
  let diff2 = color - color2;
  let dist1 = length(diff1);
  let dist2 = length(diff2);
  let totalDist = dist1 + dist2;

  if (totalDist < 0.001) {
    return color1;
  }

  // Blend factor: 0 = color1, 1 = color2
  let blend = dist1 / totalDist;

  // Use threshold for dithering decision
  if (threshold < blend) {
    return color1;
  } else {
    return color2;
  }
}

// ============================================================================
// BAYER MATRICES
// ============================================================================

// 2x2 Bayer matrix
fn bayer2(pos: vec2u) -> f32 {
  let m = array<f32, 4>(0.0, 2.0, 3.0, 1.0);
  let idx = (pos.x % 2u) + (pos.y % 2u) * 2u;
  return m[idx] / 4.0;
}

// 4x4 Bayer matrix
fn bayer4(pos: vec2u) -> f32 {
  let m = array<f32, 16>(
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
  );
  let idx = (pos.x % 4u) + (pos.y % 4u) * 4u;
  return m[idx] / 16.0;
}

// 8x8 Bayer matrix
fn bayer8(pos: vec2u) -> f32 {
  let m = array<f32, 64>(
    0.0, 32.0, 8.0, 40.0, 2.0, 34.0, 10.0, 42.0,
    48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0,
    12.0, 44.0, 4.0, 36.0, 14.0, 46.0, 6.0, 38.0,
    60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0,
    3.0, 35.0, 11.0, 43.0, 1.0, 33.0, 9.0, 41.0,
    51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0,
    15.0, 47.0, 7.0, 39.0, 13.0, 45.0, 5.0, 37.0,
    63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0
  );
  let idx = (pos.x % 8u) + (pos.y % 8u) * 8u;
  return m[idx] / 64.0;
}

// 16x16 Bayer matrix (computed from 8x8 using recursive formula)
fn bayer16(pos: vec2u) -> f32 {
  let px = pos.x % 16u;
  let py = pos.y % 16u;

  // Bayer(n) recursive: use 8x8 as base
  let bx = px % 8u;
  let by = py % 8u;
  let qx = px / 8u;
  let qy = py / 8u;

  let base = bayer8(vec2u(bx, by));
  let offset = f32(qx + qy * 2u) / 4.0;

  return (base + offset) / 4.0 + base * 0.75;
}

// Clustered dot pattern (halftone-style) - threshold version for legacy
fn clusteredDot(pos: vec2u) -> f32 {
  let m = array<f32, 64>(
    24.0, 10.0, 12.0, 26.0, 35.0, 47.0, 49.0, 37.0,
    8.0, 0.0, 2.0, 14.0, 45.0, 59.0, 61.0, 51.0,
    22.0, 6.0, 4.0, 16.0, 43.0, 57.0, 63.0, 53.0,
    30.0, 20.0, 18.0, 28.0, 33.0, 41.0, 55.0, 39.0,
    34.0, 46.0, 48.0, 36.0, 25.0, 11.0, 13.0, 27.0,
    44.0, 58.0, 60.0, 50.0, 9.0, 1.0, 3.0, 15.0,
    42.0, 56.0, 62.0, 52.0, 23.0, 7.0, 5.0, 17.0,
    32.0, 40.0, 54.0, 38.0, 31.0, 21.0, 19.0, 29.0
  );
  let idx = (pos.x % 8u) + (pos.y % 8u) * 8u;
  return m[idx] / 64.0;
}

// Clustered dot - adaptive version with dots that grow in dark areas
// Uses threshold-based approach similar to traditional clusteredDot but with luminance-adaptive dot sizes
fn clusteredDotAdaptive(pos: vec2f, lum: f32, gridSize: f32) -> f32 {
  // Use pixel position to create consistent cell pattern
  let cellSize = gridSize * 2.0; // Each cell is 2x gridSize pixels
  let cellPos = floor(pos / cellSize);
  let localPos = (pos - cellPos * cellSize) / cellSize; // 0-1 within cell

  // Single dot center per cell
  let center = vec2f(0.5, 0.5);
  let dist = length(localPos - center);

  // Darkness determines dot radius
  let darkness = 1.0 - lum;
  let maxRadius = 0.48; // Slightly less than 0.5 to prevent overlap
  let dotRadius = darkness * maxRadius;

  // Return 1 (background) if outside dot, 0 (foreground) if inside
  return 1.0 - step(dist, dotRadius);
}

// Diagonal line pattern - adaptive with lines that thicken in dark areas
fn diagonalAdaptive(pos: vec2f, lum: f32, gridSize: f32) -> f32 {
  // Use pixel position for consistent line spacing
  let lineSpacing = gridSize * 2.0;
  // Diagonal lines at 45 degrees
  let diagonalPos = (pos.x + pos.y) / lineSpacing;
  let linePos = fract(diagonalPos);
  let distFromLine = abs(linePos - 0.5);

  let darkness = 1.0 - lum;
  let maxThickness = 0.45;
  let lineThickness = darkness * maxThickness;

  return 1.0 - step(distFromLine, lineThickness);
}

// Checker pattern - adaptive with squares that grow in dark areas
fn checkerAdaptive(pos: vec2f, lum: f32, gridSize: f32) -> f32 {
  // Use pixel position for consistent cell sizing
  let cellSize = gridSize * 2.0;
  let cellPos = floor(pos / cellSize);
  let localPos = (pos - cellPos * cellSize) / cellSize - 0.5; // -0.5 to 0.5 within cell

  // Checkerboard: alternate cells
  let isBlackCell = (i32(cellPos.x) + i32(cellPos.y)) % 2 == 0;

  let darkness = 1.0 - lum;

  // In "black" cells, show foreground based on darkness
  // Square grows from center based on darkness
  let dist = max(abs(localPos.x), abs(localPos.y));
  let maxSize = 0.5;
  let squareSize = darkness * maxSize;

  if (isBlackCell) {
    return 1.0 - step(dist, squareSize);
  } else {
    // White cells: inverse - shrink the white as darkness increases
    return step(dist, 0.5 - squareSize);
  }
}

// ============================================================================
// BLUE NOISE (Procedural)
// ============================================================================

// Interleaved Gradient Noise (procedural blue noise approximation)
// From Jorge Jimenez, optimized for TAA - high quality blue noise without textures
fn interleavedGradientNoise(pos: vec2f) -> f32 {
  let magic = vec3f(0.06711056, 0.00583715, 52.9829189);
  return fract(magic.z * fract(dot(pos, magic.xy)));
}

// Enhanced blue noise approximation using multiple octaves
fn blueNoiseApprox(pos: vec2f) -> f32 {
  let n1 = interleavedGradientNoise(pos);
  let n2 = interleavedGradientNoise(pos * 1.5 + vec2f(17.0, 31.0));
  let n3 = interleavedGradientNoise(pos * 2.3 + vec2f(53.0, 97.0));
  return fract(n1 + n2 * 0.5 + n3 * 0.25);
}

// Temporal blue noise (different slice per frame)
fn temporalBlueNoise(pos: vec2f, time: f32) -> f32 {
  let base = blueNoiseApprox(pos);
  let offset = fract(time * 0.1);
  return fract(base + offset);
}

// ============================================================================
// ERROR DIFFUSION APPROXIMATIONS
// ============================================================================

// These approximate error diffusion using procedural blue noise as threshold
// True error diffusion requires sequential processing, but blue noise
// produces visually similar results that are GPU-friendly
//
// These functions return a THRESHOLD value (0-1), not a final result.
// The threshold is then compared with luminance in the main shader.

// Error diffusion threshold with configurable spread
fn errorDiffusionThreshold(pos: vec2f, spread: f32) -> f32 {
  let noise = blueNoiseApprox(pos);
  // Return threshold centered at 0.5, spread by noise
  return 0.5 + (noise - 0.5) * spread;
}

// Floyd-Steinberg approximation (moderate spread)
fn floydSteinbergThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.5);
}

// Atkinson approximation (higher contrast, less spread - 75% error)
fn atkinsonThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.35);
}

// JJN approximation (smoother, more spread)
fn jjnThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.65);
}

// Stucki approximation
fn stuckiThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.6);
}

// Burkes approximation
fn burkesThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.55);
}

// Sierra approximation
fn sierraThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.58);
}

// Sierra Two-Row approximation
fn sierraTwoRowThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.52);
}

// Sierra Lite approximation (fastest, least spread)
fn sierraLiteThreshold(pos: vec2f) -> f32 {
  return errorDiffusionThreshold(pos, 0.4);
}

// ============================================================================
// ARTISTIC PATTERNS (Luminance-Adaptive)
// ============================================================================

// Crosshatch pattern - lines thicken in dark areas, more layers appear progressively
fn crosshatchAdaptive(uv: vec2f, lum: f32, lineWeight: f32, spacing: f32, maxLayers: u32) -> f32 {
  let scaledUv = uv * spacing * 5.0;
  let darkness = 1.0 - lum;

  // Base line thickness varies with darkness
  let baseThickness = lineWeight * 0.15 * (0.5 + darkness * 1.5);

  // Determine how many layers to show based on darkness
  // Bright areas: 0-1 layers, dark areas: up to maxLayers
  let layerThreshold1 = 0.15;  // First layer appears at 15% darkness
  let layerThreshold2 = 0.35;  // Second layer at 35%
  let layerThreshold3 = 0.55;  // Third layer at 55%
  let layerThreshold4 = 0.75;  // Fourth layer at 75%

  var result = 1.0;  // Start with background

  // Layer 1: Horizontal lines (appears first in slightly dark areas)
  if (maxLayers >= 1u && darkness > layerThreshold1) {
    let linePos = fract(scaledUv.y);
    let distFromLine = abs(linePos - 0.5);
    let layerStrength = smoothstep(layerThreshold1, layerThreshold1 + 0.1, darkness);
    let thickness = baseThickness * layerStrength;
    if (distFromLine < thickness) {
      result = 0.0;
    }
  }

  // Layer 2: Diagonal 45° (appears in medium-dark areas)
  if (maxLayers >= 2u && darkness > layerThreshold2) {
    let rotUv = rotate2D(scaledUv, PI / 4.0);
    let linePos = fract(rotUv.y);
    let distFromLine = abs(linePos - 0.5);
    let layerStrength = smoothstep(layerThreshold2, layerThreshold2 + 0.1, darkness);
    let thickness = baseThickness * layerStrength;
    if (distFromLine < thickness) {
      result = 0.0;
    }
  }

  // Layer 3: Vertical lines (appears in darker areas)
  if (maxLayers >= 3u && darkness > layerThreshold3) {
    let linePos = fract(scaledUv.x);
    let distFromLine = abs(linePos - 0.5);
    let layerStrength = smoothstep(layerThreshold3, layerThreshold3 + 0.1, darkness);
    let thickness = baseThickness * layerStrength;
    if (distFromLine < thickness) {
      result = 0.0;
    }
  }

  // Layer 4: Diagonal -45° (appears in darkest areas)
  if (maxLayers >= 4u && darkness > layerThreshold4) {
    let rotUv = rotate2D(scaledUv, -PI / 4.0);
    let linePos = fract(rotUv.y);
    let distFromLine = abs(linePos - 0.5);
    let layerStrength = smoothstep(layerThreshold4, layerThreshold4 + 0.1, darkness);
    let thickness = baseThickness * layerStrength;
    if (distFromLine < thickness) {
      result = 0.0;
    }
  }

  return result;
}

// Stipple pattern - dot density and size vary with luminance
fn stippleAdaptive(uv: vec2f, lum: f32, pos: vec2f, density: f32) -> f32 {
  let darkness = 1.0 - lum;

  // Create a grid of potential dot positions
  let gridScale = density * 0.5;
  let gridUV = uv * gridScale;
  let cellID = floor(gridUV);
  let cellUV = fract(gridUV) - 0.5;

  // Random offset for each cell (jittered grid)
  let randomOffset = hash2(cellID) - 0.5;
  let jitteredPos = cellUV - randomOffset * 0.4;

  // Distance from dot center
  let dist = length(jitteredPos);

  // Dot appears based on darkness threshold with some randomness
  let cellRandom = hash(cellID + vec2f(17.3, 31.7));
  let dotThreshold = cellRandom;

  // Dot size based on darkness
  let maxDotSize = 0.35;
  let dotSize = darkness * maxDotSize;

  // Show dot if darkness exceeds random threshold AND we're inside dot radius
  if (darkness > dotThreshold && dist < dotSize) {
    return 0.0;  // Foreground (dot)
  }
  return 1.0;  // Background
}

// Engraving pattern - horizontal lines that swell in dark areas (like banknote engraving)
fn engravingAdaptive(uv: vec2f, lum: f32, lineWeight: f32, spacing: f32) -> f32 {
  let scaledY = uv.y * spacing * 10.0;
  let linePos = fract(scaledY);
  let distFromLine = abs(linePos - 0.5);

  let darkness = 1.0 - lum;

  // Line thickness varies with darkness
  // Dark areas = thick lines, bright areas = thin/no lines
  let minThickness = 0.02;  // Minimum line presence
  let maxThickness = 0.45;  // Maximum line can almost touch neighbors
  let thickness = mix(minThickness, maxThickness, darkness) * lineWeight;

  // Add slight waviness based on x position for more organic feel
  let waveOffset = sin(uv.x * spacing * 20.0) * 0.02 * darkness;
  let adjustedDist = distFromLine + waveOffset;

  // Inside line = foreground (0), outside = background (1)
  return 1.0 - step(adjustedDist, thickness);
}

// White noise - fully random dithering
fn noiseAdaptive(pos: vec2f, lum: f32) -> f32 {
  let noise = hash(pos);
  let darkness = 1.0 - lum;
  // Show foreground (0) if noise < darkness
  return 1.0 - step(noise, darkness);
}

// Film grain effect - adds noise to luminance
fn grainPattern(lum: f32, pos: vec2f, intensity: f32, time: f32) -> f32 {
  let noise = hash(pos + vec2f(time * 100.0));
  let grain = (noise - 0.5) * intensity;
  return clamp(lum + grain, 0.0, 1.0);
}

// ============================================================================
// WAVE/OSCILLATING PATTERNS
// ============================================================================

// Calculate local contrast/variance at a UV position
// This measures how much the luminance varies in a small neighborhood
// High values = edges/features, Low values = uniform areas (backgrounds)
fn getLocalContrast(uv: vec2f) -> f32 {
  let texelSize = 1.0 / uniforms.resolution;
  let sampleRadius = 3.0; // Sample in a 3-pixel radius

  // Sample center and neighbors
  let center = luminance(textureSample(inputTexture, texSampler, uv).rgb);
  let left = luminance(textureSample(inputTexture, texSampler, uv + vec2f(-sampleRadius * texelSize.x, 0.0)).rgb);
  let right = luminance(textureSample(inputTexture, texSampler, uv + vec2f(sampleRadius * texelSize.x, 0.0)).rgb);
  let up = luminance(textureSample(inputTexture, texSampler, uv + vec2f(0.0, -sampleRadius * texelSize.y)).rgb);
  let down = luminance(textureSample(inputTexture, texSampler, uv + vec2f(0.0, sampleRadius * texelSize.y)).rgb);

  // Calculate variance (difference from center)
  let diffH = abs(left - right);
  let diffV = abs(up - down);
  let diffC = abs(center - (left + right + up + down) * 0.25);

  // Return combined contrast measure (0 = uniform, 1 = high contrast)
  return clamp((diffH + diffV + diffC) * 2.0, 0.0, 1.0);
}

// Apply S-curve contrast to luminance for wave patterns
// This is the key to DitherBoy-style contrast control:
// - contrastAmount > 0: Steepen the S-curve, making mid-tones snap to black/white faster
// - contrastAmount < 0: Flatten the curve, compressing tonal range
// This affects how lines "read" the luminance - high contrast means sharper transitions
fn applyWaveContrast(lum: f32, contrastAmount: f32) -> f32 {
  // Use a sigmoid-based S-curve for natural contrast adjustment
  // Center the contrast around mid-gray (0.5)
  let centered = lum - 0.5;

  // Calculate contrast multiplier (contrast uniform is -1 to 1, but can exceed)
  // Map to a useful range for the S-curve steepness
  let steepness = 1.0 + contrastAmount * 3.0; // Range roughly 0.25 to 4.0

  // Apply S-curve: tanh-like function centered at 0.5
  // For positive contrast: push values away from mid-gray
  // For negative contrast: push values toward mid-gray
  var result: f32;
  if (steepness > 0.01) {
    // Use power curve for contrast
    let sign = select(-1.0, 1.0, centered >= 0.0);
    let magnitude = abs(centered) * 2.0; // 0 to 1 range
    let curved = pow(magnitude, 1.0 / steepness);
    result = 0.5 + sign * curved * 0.5;
  } else {
    result = 0.5; // Extreme negative contrast = all mid-gray
  }

  return clamp(result, 0.0, 1.0);
}

// Waveform Line Effect - Proper Implementation
//
// This effect creates horizontal parallel lines where each line's vertical position
// is displaced based on the image luminance at that horizontal coordinate.
// This creates the characteristic "waveform monitor" or "oscilloscope" aesthetic
// where bright areas push lines up and dark areas push lines down.
//
// The algorithm:
// 1. For each pixel, determine which "base line" it belongs to (fixed Y intervals)
// 2. Sample the image luminance at the current X position
// 3. Calculate where the line should be displaced to based on luminance
// 4. Determine if the current pixel is on/near the displaced line
// 5. Modulate line thickness based on local luminance for tonal representation
// 6. Optionally fade lines in uniform/background areas using local contrast
//
// Key insight: The line displacement is a function of X position only (for horizontal lines),
// creating smooth, continuous wave patterns that follow the image's brightness profile.
//
// Contrast Control (like DitherBoy):
// The contrast uniform specifically controls how luminance values are interpreted:
// - Higher contrast: Lines appear only at extreme bright/dark transitions
// - Lower contrast: More gradual line response across the tonal range
// This is applied BEFORE displacement and thickness calculations.

fn waveformPattern(uv: vec2f, lum: f32, freq: f32, amplitude: f32, lineWeight: f32, angle: f32) -> f32 {
  // Apply rotation if angle is not 0 (allows vertical or diagonal lines)
  let rotUV = rotate2D(uv, angle * PI / 180.0);

  // Line spacing - distance between each parallel line
  // freq controls density: higher freq = more lines = smaller spacing
  let lineSpacing = 1.0 / max(freq * 2.0, 0.5);

  // Calculate the base line index this pixel would belong to (before displacement)
  // This creates evenly spaced horizontal lines
  let baseLineIndex = floor(rotUV.y / lineSpacing);

  // Sample luminance at this X position for the displacement amount
  // The luminance determines how much this line is pushed up or down
  // We sample at the base line's Y position to ensure continuity along the line
  let sampleY = (baseLineIndex + 0.5) * lineSpacing;
  let sampleUV = vec2f(uv.x, clamp(sampleY, 0.0, 1.0));

  // Sample the original (unrotated) image at this position
  let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
  let sampleLum = luminance(sampleColor);

  // Apply brightness adjustment first
  let brightnessAdjusted = clamp(sampleLum + uniforms.brightness, 0.0, 1.0);

  // Apply WAVE-SPECIFIC contrast (like DitherBoy's Contrast slider)
  // This is the S-curve that controls how lines respond to different tonal values
  // Higher contrast = sharper transitions, lines cluster at extreme values
  // Lower contrast = smoother transitions, more even line distribution
  let adjustedLum = applyWaveContrast(brightnessAdjusted, uniforms.contrast);

  // Calculate displacement: luminance 0.5 = no displacement, 0 = down, 1 = up
  // The amplitude parameter controls the maximum displacement range
  let maxDisplacement = amplitude * lineSpacing * 2.0;
  let displacement = (adjustedLum - 0.5) * maxDisplacement;

  // The actual Y position of this line after displacement
  let lineY = (baseLineIndex + 0.5) * lineSpacing + displacement;

  // Distance from the current pixel to the displaced line
  let distToLine = abs(rotUV.y - lineY);

  // Line thickness varies with sampled luminance along the line for tonal representation
  // Brighter areas = thicker/more visible lines, darker areas = thinner/fading lines
  let baseThickness = lineWeight * lineSpacing * 0.12;
  let thickness = baseThickness * (0.2 + adjustedLum * 1.6);

  // Anti-aliased line rendering using smoothstep
  let edgeSoftness = lineSpacing * 0.015;
  let lineValue = 1.0 - smoothstep(thickness - edgeSoftness, thickness + edgeSoftness, distToLine);

  // Check adjacent lines as well (for when displacement causes overlap)
  // This prevents gaps when lines are displaced significantly
  let prevLineY = (baseLineIndex - 0.5) * lineSpacing + displacement;
  let nextLineY = (baseLineIndex + 1.5) * lineSpacing + displacement;
  let distToPrev = abs(rotUV.y - prevLineY);
  let distToNext = abs(rotUV.y - nextLineY);

  let prevLineValue = 1.0 - smoothstep(thickness - edgeSoftness, thickness + edgeSoftness, distToPrev);
  let nextLineValue = 1.0 - smoothstep(thickness - edgeSoftness, thickness + edgeSoftness, distToNext);

  // Combine all line contributions
  let combinedLine = max(lineValue, max(prevLineValue, nextLineValue));

  // LUMINANCE THRESHOLD: Lines fade out in dark areas (like DitherBoy)
  // This creates the effect where dark backgrounds have no/few lines
  // and bright areas have dense, visible lines
  // Use "intensity" uniform as the luminance threshold control:
  // intensity = 0.1 = lines only in very bright areas
  // intensity = 1.0 = lines in mid-bright areas
  // intensity = 2.0 = lines appear even in darker areas
  let lumThreshold = 1.0 - uniforms.intensity * 0.5; // Maps intensity 0.1-2.0 to threshold 0.95-0.0
  let lumMask = smoothstep(lumThreshold, lumThreshold + 0.3, adjustedLum);

  var finalLine = combinedLine * lumMask;

  // Apply edge-based masking if edgeEnhance is enabled
  // This provides additional control to show lines only near edges/features
  if (uniforms.edgeEnhance > 0.1) {
    let localContrast = getLocalContrast(uv);
    let contrastThreshold = uniforms.edgeEnhance / 100.0;
    let edgeMask = smoothstep(contrastThreshold * 0.05, contrastThreshold * 0.3, localContrast);
    finalLine = finalLine * edgeMask;
  }

  // Return: 0 = foreground (line), 1 = background
  return 1.0 - finalLine;
}

// Wave Dots - dots positioned along wave-displaced paths
// Same algorithm as waveform but renders dots instead of continuous lines
fn waveDotsPattern(uv: vec2f, lum: f32, freq: f32, amplitude: f32, dotSize: f32, angle: f32) -> f32 {
  let rotUV = rotate2D(uv, angle * PI / 180.0);

  // Line spacing for the wave paths
  let lineSpacing = 1.0 / max(freq * 2.0, 0.5);

  // Dot spacing along the X axis
  let dotSpacing = dotSize * 0.008;

  // Calculate the base line index and dot index
  let baseLineIndex = floor(rotUV.y / lineSpacing);
  let dotIndex = floor(rotUV.x / dotSpacing);

  // Sample luminance at this X position for displacement (same as waveform)
  let sampleY = (baseLineIndex + 0.5) * lineSpacing;
  let sampleUV = vec2f(uv.x, clamp(sampleY, 0.0, 1.0));
  let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
  let sampleLum = luminance(sampleColor);

  // Apply brightness and wave-specific contrast (like DitherBoy)
  let brightnessAdjusted = clamp(sampleLum + uniforms.brightness, 0.0, 1.0);
  let adjustedLum = applyWaveContrast(brightnessAdjusted, uniforms.contrast);

  // Calculate displacement
  let maxDisplacement = amplitude * lineSpacing * 2.0;
  let displacement = (adjustedLum - 0.5) * maxDisplacement;

  // The Y position of this dot row after displacement
  let lineY = (baseLineIndex + 0.5) * lineSpacing + displacement;

  // The X position of the nearest dot center
  let dotX = (dotIndex + 0.5) * dotSpacing;

  // Distance from current pixel to the dot center
  let distToDot = length(vec2f(rotUV.x - dotX, rotUV.y - lineY));

  // Dot radius varies with sampled luminance - brighter = bigger dots, darker = smaller/no dots
  let minRadius = dotSpacing * 0.1;
  let maxRadius = dotSpacing * 0.45;
  let radius = mix(minRadius, maxRadius, adjustedLum);

  // Anti-aliased dot rendering
  let edgeSoftness = radius * 0.15;
  let dotValue = 1.0 - smoothstep(radius - edgeSoftness, radius + edgeSoftness, distToDot);

  // Check adjacent lines for continuity
  let prevLineY = (baseLineIndex - 0.5) * lineSpacing + displacement;
  let nextLineY = (baseLineIndex + 1.5) * lineSpacing + displacement;
  let distToPrevDot = length(vec2f(rotUV.x - dotX, rotUV.y - prevLineY));
  let distToNextDot = length(vec2f(rotUV.x - dotX, rotUV.y - nextLineY));
  let prevDotValue = 1.0 - smoothstep(radius - edgeSoftness, radius + edgeSoftness, distToPrevDot);
  let nextDotValue = 1.0 - smoothstep(radius - edgeSoftness, radius + edgeSoftness, distToNextDot);

  let combinedDot = max(dotValue, max(prevDotValue, nextDotValue));

  // LUMINANCE THRESHOLD: Dots fade out in dark areas
  let lumThreshold = 1.0 - uniforms.intensity * 0.5;
  let lumMask = smoothstep(lumThreshold, lumThreshold + 0.3, adjustedLum);

  var finalDot = combinedDot * lumMask;

  // Apply edge-based masking if edgeEnhance is enabled
  if (uniforms.edgeEnhance > 0.1) {
    let localContrast = getLocalContrast(uv);
    let contrastThreshold = uniforms.edgeEnhance / 100.0;
    let edgeMask = smoothstep(contrastThreshold * 0.05, contrastThreshold * 0.3, localContrast);
    finalDot = finalDot * edgeMask;
  }

  // Return: 0 = foreground (dot), 1 = background
  return 1.0 - finalDot;
}

// Oscillating Halftone - halftone grid with wave-based displacement
// The halftone grid is displaced based on image luminance, creating an oscillating pattern
fn oscillatingHalftonePattern(uv: vec2f, lum: f32, freq: f32, amplitude: f32, dotSize: f32, angle: f32) -> f32 {
  let rotUV = rotate2D(uv, angle * PI / 180.0);

  // Grid size for halftone cells
  let gridSize = dotSize * 0.008;

  // Calculate which grid cell we're in
  let cellIndex = floor(rotUV / gridSize);
  let cellCenter = (cellIndex + 0.5) * gridSize;

  // Sample luminance at the cell center for displacement calculation
  let sampleUV = clamp(cellCenter, vec2f(0.0), vec2f(1.0));
  let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
  let sampleLum = luminance(sampleColor);

  // Apply brightness and wave-specific contrast (like DitherBoy)
  let brightnessAdjusted = clamp(sampleLum + uniforms.brightness, 0.0, 1.0);
  let adjustedLum = applyWaveContrast(brightnessAdjusted, uniforms.contrast);

  // Create wave displacement based on luminance deviation from mid-gray
  // Areas that differ from mid-gray get more wave displacement
  let lumDeviation = abs(adjustedLum - 0.5) * 2.0;
  let wavePhaseX = rotUV.y * freq * 20.0;
  let wavePhaseY = rotUV.x * freq * 20.0;
  let waveX = sin(wavePhaseX) * amplitude * 0.03 * lumDeviation;
  let waveY = sin(wavePhaseY) * amplitude * 0.03 * lumDeviation;

  // Apply displacement to get the actual dot center
  let displacedCenter = cellCenter + vec2f(waveX, waveY);

  // Distance from current pixel to displaced dot center
  let distToDot = length(rotUV - displacedCenter);

  // Dot radius based on sampled luminance - brighter = bigger dots
  let minRadius = gridSize * 0.1;
  let maxRadius = gridSize * 0.48;
  let radius = mix(minRadius, maxRadius, adjustedLum);

  // Anti-aliased dot rendering
  let edgeSoftness = gridSize * 0.03;
  let dotValue = 1.0 - smoothstep(radius - edgeSoftness, radius + edgeSoftness, distToDot);

  // LUMINANCE THRESHOLD: Dots fade out in dark areas
  let lumThreshold = 1.0 - uniforms.intensity * 0.5;
  let lumMask = smoothstep(lumThreshold, lumThreshold + 0.3, adjustedLum);

  var finalDot = dotValue * lumMask;

  // Apply edge-based masking if edgeEnhance is enabled
  if (uniforms.edgeEnhance > 0.1) {
    let localContrast = getLocalContrast(uv);
    let contrastThreshold = uniforms.edgeEnhance / 100.0;
    let edgeMask = smoothstep(contrastThreshold * 0.05, contrastThreshold * 0.3, localContrast);
    finalDot = finalDot * edgeMask;
  }

  // Return: 0 = foreground (dot), 1 = background
  return 1.0 - finalDot;
}

// Neon Wave - glowing lines with wave displacement for neon aesthetic
// Uses the same proper waveform algorithm but with glow rendering
fn neonWavePattern(uv: vec2f, lum: f32, freq: f32, amplitude: f32, dotSize: f32, angle: f32, time: f32) -> f32 {
  let rotUV = rotate2D(uv, angle * PI / 180.0);

  // Line spacing
  let lineSpacing = 1.0 / max(freq * 2.0, 0.5);

  // Calculate the base line index
  let baseLineIndex = floor(rotUV.y / lineSpacing);

  // Sample luminance at this X position for displacement
  let sampleY = (baseLineIndex + 0.5) * lineSpacing;
  let sampleUV = vec2f(uv.x, clamp(sampleY, 0.0, 1.0));
  let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
  let sampleLum = luminance(sampleColor);

  // Apply brightness and wave-specific contrast (like DitherBoy)
  let brightnessAdjusted = clamp(sampleLum + uniforms.brightness, 0.0, 1.0);
  let adjustedLum = applyWaveContrast(brightnessAdjusted, uniforms.contrast);

  // Calculate displacement with subtle time-based animation
  let maxDisplacement = amplitude * lineSpacing * 2.5;
  let animOffset = sin(time * 0.5 + rotUV.x * 8.0) * 0.01 * lineSpacing;
  let displacement = (adjustedLum - 0.5) * maxDisplacement + animOffset;

  // The Y position of this line after displacement
  let lineY = (baseLineIndex + 0.5) * lineSpacing + displacement;

  // Distance from current pixel to the line
  let distToLine = abs(rotUV.y - lineY);

  // Glow effect parameters - size varies with sampled luminance (brighter = bigger glow)
  let coreSize = dotSize * lineSpacing * 0.02 * (0.3 + adjustedLum * 1.0);
  let glowSize = dotSize * lineSpacing * 0.08 * (0.3 + adjustedLum * 1.0);

  // Create glow: bright core with falloff
  let core = smoothstep(coreSize, 0.0, distToLine);
  let glow = smoothstep(glowSize, coreSize, distToLine) * 0.4;
  let neonValue = core + glow;

  // Check adjacent lines
  let prevLineY = (baseLineIndex - 0.5) * lineSpacing + displacement;
  let nextLineY = (baseLineIndex + 1.5) * lineSpacing + displacement;
  let distToPrev = abs(rotUV.y - prevLineY);
  let distToNext = abs(rotUV.y - nextLineY);

  let prevCore = smoothstep(coreSize, 0.0, distToPrev);
  let prevGlow = smoothstep(glowSize, coreSize, distToPrev) * 0.4;
  let nextCore = smoothstep(coreSize, 0.0, distToNext);
  let nextGlow = smoothstep(glowSize, coreSize, distToNext) * 0.4;

  let combinedNeon = max(neonValue, max(prevCore + prevGlow, nextCore + nextGlow));

  // LUMINANCE THRESHOLD: Neon lines fade out in dark areas
  let lumThreshold = 1.0 - uniforms.intensity * 0.5;
  let lumMask = smoothstep(lumThreshold, lumThreshold + 0.3, adjustedLum);

  var finalNeon = combinedNeon * lumMask;

  // Apply edge-based masking if edgeEnhance is enabled
  if (uniforms.edgeEnhance > 0.1) {
    let localContrast = getLocalContrast(uv);
    let contrastThreshold = uniforms.edgeEnhance / 100.0;
    let edgeMask = smoothstep(contrastThreshold * 0.05, contrastThreshold * 0.3, localContrast);
    finalNeon = finalNeon * edgeMask;
  }

  // Return: 0 = foreground (neon line), 1 = background
  return 1.0 - finalNeon;
}

// ============================================================================
// MODULATION EFFECTS
// ============================================================================

// Get UV displacement for modulation effects
fn getModulationDisplacement(uv: vec2f, modType: u32, freq: f32, amp: f32, phase: f32) -> vec2f {
  let scaledAmp = amp * 0.05; // Scale amplitude for UV displacement

  switch (modType) {
    case 0u: { // Wave (vertical displacement based on x)
      let offset = sin(uv.x * freq * PI * 2.0 + phase) * scaledAmp;
      return vec2f(0.0, offset);
    }
    case 1u: { // Grid (both x and y displacement)
      let offsetX = sin(uv.y * freq * PI * 2.0 + phase) * scaledAmp;
      let offsetY = sin(uv.x * freq * PI * 2.0 + phase) * scaledAmp;
      return vec2f(offsetX, offsetY);
    }
    case 2u: { // Horizontal (horizontal displacement based on y)
      let offset = sin(uv.y * freq * PI * 2.0 + phase) * scaledAmp;
      return vec2f(offset, 0.0);
    }
    case 3u: { // Radial (displacement outward from center)
      let center = vec2f(0.5, 0.5);
      let toCenter = uv - center;
      let dist = length(toCenter);
      let dir = normalize(toCenter + vec2f(0.0001)); // Avoid div by zero
      let offset = sin(dist * freq * PI * 4.0 + phase) * scaledAmp;
      return dir * offset;
    }
    case 4u: { // RGB Split - handled specially in applyRGBModulation
      return vec2f(0.0);
    }
    default: {
      return vec2f(0.0);
    }
  }
}

// Get threshold modulation offset (for dither pattern modulation)
fn getThresholdModulationOffset(uv: vec2f, modType: u32, freq: f32, amp: f32, phase: f32) -> f32 {
  switch (modType) {
    case 0u: { // Wave
      return sin(uv.x * freq * PI * 2.0 + phase) * amp;
    }
    case 1u: { // Grid
      return sin(uv.x * freq * PI * 2.0) * sin(uv.y * freq * PI * 2.0) * amp;
    }
    case 2u: { // Horizontal
      return sin(uv.y * freq * PI * 2.0 + phase) * amp;
    }
    case 3u: { // Radial
      let center = vec2f(0.5, 0.5);
      let dist = length(uv - center);
      return sin(dist * freq * PI * 4.0 + phase) * amp;
    }
    case 4u: { // RGB Split - no threshold modulation
      return 0.0;
    }
    default: {
      return 0.0;
    }
  }
}

// ============================================================================
// MAIN DITHERING FUNCTION
// ============================================================================

// Returns true if this method is adaptive (returns direct 0/1, not threshold)
fn isAdaptiveMethod(methodId: u32) -> bool {
  // Adaptive methods: 14-16 (clustered, diagonal, checker), 20 (crosshatch)
  return (methodId >= 14u && methodId <= 16u) || methodId == 20u;
}

// Get adaptive pattern result (returns direct 0/1 value based on luminance)
fn getAdaptivePattern(methodId: u32, pos: vec2f, uv: vec2f, lum: f32, gridSize: f32) -> f32 {
  // Apply brightness mapping gamma to spread out tonal values
  // This is crucial for dark images where most values cluster near 0
  // gamma < 1 = expand dark range (good for dark images)
  // gamma > 1 = expand bright range
  let gamma = uniforms.brightnessMapping;
  let adjustedLum = pow(max(lum, 0.001), gamma);

  switch (methodId) {
    // Ordered Adaptive (14-16) - use pixel position for pattern
    case 14u: { return clusteredDotAdaptive(pos, adjustedLum, gridSize); }
    case 15u: { return diagonalAdaptive(pos, adjustedLum, gridSize); }
    case 16u: { return checkerAdaptive(pos, adjustedLum, gridSize); }

    // Artistic Adaptive (20-24)
    case 20u: { return crosshatchAdaptive(uv, adjustedLum, uniforms.lineWeight, uniforms.lineSpacing, u32(uniforms.layers)); }

    default: { return 0.5; }
  }
}

// Get threshold for non-adaptive methods (traditional dithering)
fn getThreshold(methodId: u32, pos: vec2f, posU: vec2u, uv: vec2f, lum: f32, gridSize: f32) -> f32 {
  var threshold: f32 = 0.5;

  switch (methodId) {
    // Error Diffusion (0-7) - return threshold values
    case 0u: { threshold = floydSteinbergThreshold(pos); }
    case 1u: { threshold = atkinsonThreshold(pos); }
    case 2u: { threshold = jjnThreshold(pos); }
    case 3u: { threshold = stuckiThreshold(pos); }
    case 4u: { threshold = burkesThreshold(pos); }
    case 5u: { threshold = sierraThreshold(pos); }
    case 6u: { threshold = sierraTwoRowThreshold(pos); }
    case 7u: { threshold = sierraLiteThreshold(pos); }

    // Ordered Dithering (8-13) - Bayer matrices return thresholds
    case 8u: { threshold = bayer2(posU); }
    case 9u: { threshold = bayer4(posU); }
    case 10u: { threshold = bayer8(posU); }
    case 11u: { threshold = bayer16(posU); }
    case 12u: { threshold = bayer8(posU); } // "ordered" alias
    case 13u: { threshold = bayer4(posU); } // "bayer" alias

    // Blue Noise (17-19) - return thresholds
    case 17u: { threshold = blueNoiseApprox(pos); }
    case 18u: { threshold = temporalBlueNoise(pos, uniforms.time); }
    case 19u: { threshold = interleavedGradientNoise(pos); }

    // Grain (31) - special case, returns continuous value
    case 31u: { return grainPattern(lum, pos, uniforms.intensity, uniforms.time); }

    default: { threshold = bayer8(posU); }
  }

  return threshold;
}

// ============================================================================
// ADVANCED POST-PROCESSING EFFECTS
// ============================================================================

// Epsilon Glow Effect - creates a glowing halo around bright areas
// Based on distance field techniques for soft, adjustable glow
fn applyEpsilonGlow(color: vec3f, uv: vec2f) -> vec3f {
  if (uniforms.epsilonGlowEnabled < 0.5) {
    return color;
  }

  let threshold = uniforms.epsilonThreshold / 100.0;
  let smoothing = uniforms.epsilonThresholdSmooth / 100.0;
  let radius = uniforms.epsilonRadius;
  let intensity = uniforms.epsilonIntensity / 100.0;
  let aspectRatio = uniforms.epsilonAspectRatio / 100.0;
  let direction = uniforms.epsilonDirection * PI / 180.0;
  let falloff = uniforms.epsilonFalloff;
  let eps = uniforms.epsilonEpsilon / 100.0;
  let distScale = uniforms.epsilonDistanceScale / 100.0;

  let texelSize = 1.0 / uniforms.resolution;
  var glowAccum = vec3f(0.0);
  var totalWeight = 0.0;

  // Direction vector for anisotropic glow
  let dirVec = vec2f(cos(direction), sin(direction));

  // Sample in a circular/elliptical pattern around the pixel
  let sampleCount = i32(radius);
  for (var i = -sampleCount; i <= sampleCount; i++) {
    for (var j = -sampleCount; j <= sampleCount; j++) {
      let offset = vec2f(f32(i), f32(j));

      // Apply aspect ratio and direction
      let rotatedOffset = vec2f(
        offset.x * cos(direction) - offset.y * sin(direction),
        offset.x * sin(direction) + offset.y * cos(direction)
      );
      let scaledOffset = vec2f(rotatedOffset.x, rotatedOffset.y * aspectRatio);

      let dist = length(scaledOffset);
      if (dist > f32(sampleCount)) { continue; }

      let sampleUV = uv + scaledOffset * texelSize * distScale;
      let sampleColor = textureSample(inputTexture, texSampler, clamp(sampleUV, vec2f(0.0), vec2f(1.0))).rgb;
      let sampleLum = luminance(sampleColor);

      // Only accumulate from bright areas above threshold
      let brightnessMask = smoothstep(threshold - smoothing, threshold + smoothing, sampleLum);

      // Distance-based falloff
      let weight = pow(1.0 - dist / f32(sampleCount + 1), falloff) * brightnessMask;

      glowAccum += sampleColor * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > eps) {
    glowAccum /= totalWeight;
  }

  // Add glow to original color
  return color + glowAccum * intensity;
}

// JPEG Glitch Effects - these compute UV/coordinate offsets that affect sampling
// They return modified coordinates that will be used to sample the source image

// Get block shift offset for a given coordinate
fn getBlockShiftOffset(fragCoord: vec2f) -> vec2f {
  if (uniforms.jpegBlockShiftEnabled < 0.5 || uniforms.jpegBlockShift < 0.5) {
    return vec2f(0.0);
  }

  let blockSize = 8.0;
  let blockY = floor(fragCoord.y / blockSize);
  let randVal = hash(vec2f(blockY, floor(uniforms.time * 2.0)));

  // Shift entire rows of blocks horizontally
  let shiftAmount = (randVal - 0.5) * uniforms.jpegBlockShift * 2.0;
  return vec2f(shiftAmount, 0.0);
}

// Get scanline offset for a given coordinate
fn getScanlineOffset(fragCoord: vec2f) -> vec2f {
  if (uniforms.jpegScanlineEnabled < 0.5 || uniforms.jpegScanlineOffset < 0.5) {
    return vec2f(0.0);
  }

  let lineInterval = max(uniforms.jpegScanlineOffset, 1.0);
  let lineY = floor(fragCoord.y);

  // Only offset every Nth line
  if (u32(lineY) % u32(lineInterval) != 0u) {
    return vec2f(0.0);
  }

  let randVal = hash(vec2f(lineY, floor(uniforms.time * 3.0)));
  let offset = (randVal - 0.5) * 20.0; // Horizontal pixel offset
  return vec2f(offset, 0.0);
}

// Get block scramble offset - moves blocks to different positions
fn getBlockScrambleOffset(fragCoord: vec2f) -> vec2f {
  if (uniforms.jpegBlockScrambleEnabled < 0.5 || uniforms.jpegBlockScramble < 0.5) {
    return vec2f(0.0);
  }

  let blockSize = 8.0 + uniforms.jpegBlockScramble * 0.2;
  let blockCoord = floor(fragCoord / blockSize);

  let randVal = hash(blockCoord + vec2f(floor(uniforms.time * 0.5), 0.0));
  let scrambleAmount = uniforms.jpegBlockScramble / 50.0;

  // Only scramble some blocks
  if (randVal > scrambleAmount) {
    return vec2f(0.0);
  }

  let randOffset = hash2(blockCoord + vec2f(floor(uniforms.time), 0.0));
  return (randOffset - 0.5) * uniforms.jpegBlockScramble * 2.0;
}

// Get interlace offset - shifts alternating lines
fn getInterlaceOffset(fragCoord: vec2f) -> vec2f {
  if (uniforms.jpegInterlaceEnabled < 0.5 || uniforms.jpegInterlace < 0.5) {
    return vec2f(0.0);
  }

  let lineY = u32(fragCoord.y);

  // Only affect even lines
  if (lineY % 2u != 0u) {
    return vec2f(0.0);
  }

  let intensity = uniforms.jpegInterlace / 100.0;
  let randVal = hash(vec2f(f32(lineY), floor(uniforms.time * 2.0)));

  if (randVal > intensity) {
    return vec2f(0.0);
  }

  return vec2f((randVal - 0.5) * 10.0 * intensity, 0.0);
}

// Combined glitch offset - returns total UV displacement
fn getGlitchOffset(fragCoord: vec2f) -> vec2f {
  var offset = vec2f(0.0);
  offset += getBlockShiftOffset(fragCoord);
  offset += getScanlineOffset(fragCoord);
  offset += getBlockScrambleOffset(fragCoord);
  offset += getInterlaceOffset(fragCoord);
  return offset;
}

// Apply channel swap to already-sampled color
fn applyChannelSwap(color: vec3f, fragCoord: vec2f) -> vec3f {
  if (uniforms.jpegChannelSwapEnabled < 0.5 || uniforms.jpegChannelSwap < 0.5) {
    return color;
  }

  let blockSize = 16.0;
  let intensity = uniforms.jpegChannelSwap / 100.0;

  let blockId = floor(fragCoord / blockSize);
  let randVal = hash(blockId + vec2f(floor(uniforms.time * 0.5), 0.0));

  if (randVal > intensity) { return color; }

  // Determine swap type based on random value
  let swapType = u32(randVal * 6.0);
  switch (swapType) {
    case 0u: { return color.rbg; }
    case 1u: { return color.grb; }
    case 2u: { return color.gbr; }
    case 3u: { return color.brg; }
    case 4u: { return color.bgr; }
    default: { return color; }
  }
}

// Check if any glitch effects are enabled
fn hasGlitchEffects() -> bool {
  return (uniforms.jpegBlockShiftEnabled > 0.5 && uniforms.jpegBlockShift > 0.5) ||
         (uniforms.jpegScanlineEnabled > 0.5 && uniforms.jpegScanlineOffset > 0.5) ||
         (uniforms.jpegBlockScrambleEnabled > 0.5 && uniforms.jpegBlockScramble > 0.5) ||
         (uniforms.jpegInterlaceEnabled > 0.5 && uniforms.jpegInterlace > 0.5);
}

// ============================================================================
// POST-DITHERING EFFECTS - Applied to dithered output
// These effects work on any color mode by operating on the actual output colors
// ============================================================================

// Apply chromatic aberration effect
// Creates RGB color separation/fringing based on screen position
fn applyChromaticEffect(color: vec3f, fragCoord: vec2f, uv: vec2f) -> vec3f {
  if (uniforms.chromaticEnabled < 0.5) {
    return color;
  }

  let maxDisplace = uniforms.chromaticMaxDisplace;
  let redAngle = uniforms.chromaticRed * PI / 180.0;
  let greenAngle = uniforms.chromaticGreen * PI / 180.0;
  let blueAngle = uniforms.chromaticBlue * PI / 180.0;

  // Calculate offset directions for each channel
  let redOffset = vec2f(cos(redAngle), sin(redAngle)) * maxDisplace / uniforms.resolution;
  let greenOffset = vec2f(cos(greenAngle), sin(greenAngle)) * maxDisplace / uniforms.resolution;
  let blueOffset = vec2f(cos(blueAngle), sin(blueAngle)) * maxDisplace / uniforms.resolution;

  // Sample each channel from slightly different positions
  let redSample = textureSample(inputTexture, texSampler, clamp(uv + redOffset, vec2f(0.0), vec2f(1.0))).r;
  let greenSample = textureSample(inputTexture, texSampler, clamp(uv + greenOffset, vec2f(0.0), vec2f(1.0))).g;
  let blueSample = textureSample(inputTexture, texSampler, clamp(uv + blueOffset, vec2f(0.0), vec2f(1.0))).b;

  // Mix the chromatic offset with the original color
  let chromaticColor = vec3f(redSample, greenSample, blueSample);
  let intensity = maxDisplace / 100.0;
  return mix(color, chromaticColor, clamp(intensity, 0.0, 1.0));
}

// Apply JPEG glitch effects to the output
// Works on any color mode by manipulating the actual output colors
fn applyGlitchEffect(color: vec3f, fragCoord: vec2f) -> vec3f {
  var result = color;

  // Block shift - shifts entire rows of blocks
  if (uniforms.jpegBlockShiftEnabled > 0.5 && uniforms.jpegBlockShift > 0.5) {
    let blockSize = 8.0;
    let blockY = floor(fragCoord.y / blockSize);
    let randVal = hash(vec2f(blockY, floor(uniforms.time * 2.0)));
    let shiftChance = uniforms.jpegBlockShift / 100.0;

    if (randVal < shiftChance) {
      // Swap color channels for glitch effect
      result = mix(result, result.gbr, randVal * 0.8);
    }
  }

  // Scanline effect - color shift on specific lines
  if (uniforms.jpegScanlineEnabled > 0.5 && uniforms.jpegScanlineOffset > 0.5) {
    let lineInterval = max(uniforms.jpegScanlineOffset, 1.0);
    let lineY = floor(fragCoord.y);

    if (u32(lineY) % u32(lineInterval) == 0u) {
      let randVal = hash(vec2f(lineY, floor(uniforms.time * 3.0)));
      // Apply RGB channel shift on affected scanlines
      result = mix(result, result.brg, randVal * 0.5);
    }
  }

  // Block scramble - corrupt colors in random blocks
  if (uniforms.jpegBlockScrambleEnabled > 0.5 && uniforms.jpegBlockScramble > 0.5) {
    let blockSize = 8.0 + uniforms.jpegBlockScramble * 0.2;
    let blockCoord = floor(fragCoord / blockSize);
    let randVal = hash(blockCoord + vec2f(floor(uniforms.time * 0.5), 0.0));
    let scrambleAmount = uniforms.jpegBlockScramble / 100.0;

    if (randVal < scrambleAmount) {
      // Corrupt this block - scramble color channels
      let corruption = hash2(blockCoord);
      result = mix(result, result.bgr, corruption.x * scrambleAmount);
    }
  }

  // Interlace effect - affect alternating lines
  if (uniforms.jpegInterlaceEnabled > 0.5 && uniforms.jpegInterlace > 0.5) {
    let lineY = u32(fragCoord.y);
    let intensity = uniforms.jpegInterlace / 100.0;

    if (lineY % 2u == 0u) {
      let randVal = hash(vec2f(f32(lineY), floor(uniforms.time * 2.0)));
      if (randVal < intensity) {
        result = mix(result, result.brg, intensity * 0.5);
      }
    }
  }

  return result;
}

// Apply channel swap effect
// Randomly swaps RGB channels in blocks
fn applyChannelSwapEffect(color: vec3f, fragCoord: vec2f) -> vec3f {
  if (uniforms.jpegChannelSwapEnabled < 0.5 || uniforms.jpegChannelSwap < 0.5) {
    return color;
  }

  let blockSize = 16.0;
  let intensity = uniforms.jpegChannelSwap / 100.0;

  let blockId = floor(fragCoord / blockSize);
  let randVal = hash(blockId + vec2f(floor(uniforms.time * 0.5), 0.0));

  if (randVal > intensity) { return color; }

  let swapType = u32(randVal * 6.0);
  switch (swapType) {
    case 0u: { return color.rbg; }
    case 1u: { return color.grb; }
    case 2u: { return color.gbr; }
    case 3u: { return color.brg; }
    case 4u: { return color.bgr; }
    default: { return color; }
  }
}

// Epsilon Glow / Bloom effect for dithered output
// Since we can't sample our own output in a single pass, this creates a glow
// effect based on the current pixel's brightness - bright dithered pixels will glow
fn applyEpsilonGlowEffect(color: vec3f, uv: vec2f) -> vec3f {
  if (uniforms.epsilonGlowEnabled < 0.5) {
    return color;
  }

  // Glow parameters
  let threshold = uniforms.epsilonThreshold / 100.0;
  let smoothing = uniforms.epsilonThresholdSmooth / 100.0;
  let intensity = uniforms.epsilonIntensity / 100.0;
  let saturationBoost = 1.0 + uniforms.epsilonEpsilon / 50.0;
  let spread = uniforms.epsilonDistanceScale / 100.0;
  let falloff = uniforms.epsilonFalloff;

  // Check if current pixel is bright enough to glow
  let pixelLum = luminance(color);
  let glowMask = smoothstep(threshold - smoothing, threshold + smoothing, pixelLum);

  if (glowMask < 0.01) {
    return color;
  }

  // Boost saturation of the glow color
  let maxC = max(color.r, max(color.g, color.b));
  var glowColor = select(color, mix(vec3f(maxC), color, saturationBoost), maxC > 0.01);

  // Create the glow effect - brighten and spread the color
  // Inner glow: strong, close to the original color
  let innerGlow = glowColor * intensity * 2.0 * glowMask;

  // Outer glow: softer halo effect by boosting overall brightness
  let outerGlow = glowColor * intensity * spread * glowMask * 0.5;

  // Combine: add glow on top of original
  var result = color + innerGlow + outerGlow;

  // HDR tonemapping to prevent washout
  result = result / (1.0 + result * 0.2);

  return result;
}

// Combined post-processing for dithered output
// Works on any color mode - effects apply to the entire dithered image
fn applyPostProcessing(color: vec3f, fragCoord: vec2f, uv: vec2f) -> vec3f {
  var result = color;

  // Apply all effects to the dithered output
  result = applyChromaticEffect(result, fragCoord, uv);
  result = applyGlitchEffect(result, fragCoord);
  result = applyChannelSwapEffect(result, fragCoord);
  result = applyEpsilonGlowEffect(result, uv);

  return result;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let fragCoord = texCoord * uniforms.resolution;

  // Grid size for pixelation (matrixSize only, intensity controls threshold bias)
  let gridSize = max(uniforms.matrixSize, 1.0);

  // Pixelate UV coordinates
  let pixelatedUV = floor(fragCoord / gridSize) * gridSize / uniforms.resolution;
  let pixelPos = floor(fragCoord / gridSize) * gridSize;
  let pixelPosU = vec2u(floor(fragCoord / gridSize));

  // Sample input
  var baseColor: vec3f;
  let modType = u32(uniforms.modType);

  if (uniforms.modEnabled > 0.5 && modType == 4u) {
    // RGB Split mode - sample each channel with different UV offsets
    let rgbAmp = uniforms.modAmp * 0.02;
    let rgbFreq = uniforms.modFreq;
    let phase = uniforms.modPhase;

    // Create wave-based RGB separation
    let waveR = sin(texCoord.y * rgbFreq * PI * 2.0 + phase) * rgbAmp;
    let waveG = sin(texCoord.y * rgbFreq * PI * 2.0 + phase + PI * 0.666) * rgbAmp;
    let waveB = sin(texCoord.y * rgbFreq * PI * 2.0 + phase + PI * 1.333) * rgbAmp;

    let uvR = floor((fragCoord + vec2f(waveR * uniforms.resolution.x, 0.0)) / gridSize) * gridSize / uniforms.resolution;
    let uvG = floor((fragCoord + vec2f(waveG * uniforms.resolution.x, 0.0)) / gridSize) * gridSize / uniforms.resolution;
    let uvB = floor((fragCoord + vec2f(waveB * uniforms.resolution.x, 0.0)) / gridSize) * gridSize / uniforms.resolution;

    baseColor = vec3f(
      textureSample(inputTexture, texSampler, uvR).r,
      textureSample(inputTexture, texSampler, uvG).g,
      textureSample(inputTexture, texSampler, uvB).b
    );
  } else if (uniforms.modEnabled > 0.5) {
    // UV displacement modulation - distort the sampling coordinates
    let displacement = getModulationDisplacement(
      texCoord,
      modType,
      uniforms.modFreq,
      uniforms.modAmp,
      uniforms.modPhase
    );
    let displacedUV = floor((fragCoord + displacement * uniforms.resolution) / gridSize) * gridSize / uniforms.resolution;
    baseColor = textureSample(inputTexture, texSampler, displacedUV).rgb;
  } else {
    // Apply blur if enabled (sample with blur instead of direct)
    if (uniforms.blur > 0.01) {
      baseColor = applyBlur(pixelatedUV, uniforms.blur);
    } else {
      baseColor = textureSample(inputTexture, texSampler, pixelatedUV).rgb;
    }
  }

  // Store original color BEFORE adjustments (for palette matching in indexed mode)
  let originalColor = baseColor;

  // Apply edge enhancement (before other adjustments for better detection)
  baseColor = applyEdgeEnhance(baseColor, pixelatedUV, uniforms.edgeEnhance);

  // Apply sharpening (from dithering settings)
  baseColor = applySharpen(baseColor, pixelatedUV, uniforms.sharpen);

  // Apply adjustments - these affect WHERE dithering appears, not the final colors
  var adjustedColor = applyBrightnessContrast(baseColor, uniforms.brightness, uniforms.contrast);
  adjustedColor = applyGamma(adjustedColor, uniforms.gamma);

  // Apply brightness mapping (gamma curve on luminance)
  if (uniforms.brightnessMapping != 1.0) {
    let lum_orig = luminance(adjustedColor);
    if (lum_orig > 0.001) {
      let lum_mapped = pow(lum_orig, uniforms.brightnessMapping);
      adjustedColor = adjustedColor * (lum_mapped / lum_orig);
      adjustedColor = clamp(adjustedColor, vec3f(0.0), vec3f(1.0));
    }
  }

  // Apply color quantization (before dithering)
  adjustedColor = applyQuantize(adjustedColor, uniforms.quantizeColors);

  // Use adjusted luminance for dithering pattern decisions
  let lum = luminance(adjustedColor);
  let methodId = u32(uniforms.method + 0.5);
  let colorModeId = u32(uniforms.colorMode + 0.5);

  // Get foreground and background colors
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  var outputColor: vec3f;

  // Special handling for grain (returns continuous values)
  if (methodId == 24u) {
    let grainedLum = grainPattern(lum, pixelPos, uniforms.intensity * 0.3, uniforms.time);
    if (colorModeId == 0u || colorModeId == 4u) { // mono/bw
      outputColor = mix(bgColor, fgColor, grainedLum);
    } else {
      outputColor = baseColor * (0.7 + grainedLum * 0.3);
    }
    // Grain is continuous, use luminance as foreground indicator
    let isForeground = grainedLum;
    outputColor = applyPostProcessing(outputColor, fragCoord, texCoord);
    return vec4f(outputColor, 1.0);
  }

  // Handle adaptive methods - these return direct 0/1 values based on luminance
  // Includes: halftone (20-25), artistic (27-30), wave (32-35), and some ordered (14-16)
  if (isAdaptiveMethod(methodId)) {
    // Apply intensity to luminance for adaptive patterns
    let intensityBias = (uniforms.intensity - 1.0) * 0.3;
    let adjustedLumForPattern = clamp(lum + intensityBias, 0.0, 1.0);
    let patternResult = getAdaptivePattern(methodId, pixelPos, texCoord, adjustedLumForPattern, gridSize);
    // patternResult is 0.0 (foreground) or 1.0 (background)
    // isForeground = 1.0 when patternResult = 0.0 (on the pattern)
    var isForeground = 1.0 - patternResult;

    if (colorModeId == 2u) { // indexed (palette)
      // Use adjusted color for palette matching so brightness/contrast/gamma affect output
      let palSize = u32(max(uniforms.paletteSize, 2.0));
      // Use patternResult as threshold for dithering between two nearest palette colors
      outputColor = ditherPaletteColor(adjustedColor, patternResult, palSize);
    } else if (colorModeId == 6u) { // original colors
      // Use original unadjusted color
      outputColor = mix(originalColor, bgColor, patternResult);
    } else if (colorModeId == 3u || colorModeId == 5u) { // rgb/color - use original colors
      outputColor = mix(originalColor, bgColor, patternResult);
    } else if (colorModeId == 1u) { // tonal - blend between fg and bg based on luminance
      let tonalColor = mix(bgColor, fgColor, lum);
      outputColor = mix(tonalColor, bgColor, patternResult);
    } else { // mono, bw - use fg/bg colors
      outputColor = mix(fgColor, bgColor, patternResult);
    }
    // Apply post-processing effects only to foreground pixels
    outputColor = applyPostProcessing(outputColor, fragCoord, texCoord);
    return vec4f(outputColor, 1.0);
  }

  // Get threshold for non-adaptive methods (error diffusion, bayer, blue noise)
  var threshold = getThreshold(methodId, pixelPos, pixelPosU, texCoord, lum, gridSize);

  // Apply modulation to threshold if enabled (creates patterns in dithering)
  if (uniforms.modEnabled > 0.5) {
    let modOffset = getThresholdModulationOffset(
      texCoord,
      u32(uniforms.modType),
      uniforms.modFreq,
      uniforms.modAmp,
      uniforms.modPhase
    );
    threshold = threshold + modOffset;
  }

  // Apply intensity as threshold bias (controls black/white balance)
  // intensity > 1 = more white/foreground (eliminates dark background dots)
  // intensity < 1 = more black/background (eliminates bright foreground dots)
  // Range 0.1-2.0 maps to strong effect for eliminating unwanted dithering
  let intensityBias = (uniforms.intensity - 1.0);

  // Calculate black/white point cutoffs from intensity
  // At intensity > 1: create a black point floor (pixels darker than this = pure black)
  // At intensity < 1: create a white point ceiling (pixels brighter than this = pure white)
  let blackPoint = max(0.0, (uniforms.intensity - 1.0) * 0.5);
  let whitePoint = min(1.0, 1.0 + (uniforms.intensity - 1.0) * 0.5);

  // Track whether each pixel is foreground or background for post-processing
  var isForeground: f32 = 0.0;

  // Apply dithering based on color mode
  switch (colorModeId) {
    case 0u, 4u: { // mono, bw
      // If luminance is below black point, force pure background (no dithering)
      // If luminance is above white point, force pure foreground (no dithering)
      if (lum < blackPoint) {
        outputColor = bgColor;
        isForeground = 0.0;
      } else if (lum > whitePoint) {
        outputColor = fgColor;
        isForeground = 1.0;
      } else {
        // Remap luminance to 0-1 range within black/white points
        let remappedLum = (lum - blackPoint) / max(whitePoint - blackPoint, 0.001);
        let dithered = step(threshold, remappedLum);
        outputColor = mix(bgColor, fgColor, dithered);
        isForeground = dithered;
      }
    }
    case 1u: { // tonal (grayscale with custom colors)
      if (lum < blackPoint) {
        outputColor = bgColor;
        isForeground = 0.0;
      } else if (lum > whitePoint) {
        outputColor = fgColor;
        isForeground = 1.0;
      } else {
        let remappedLum = (lum - blackPoint) / max(whitePoint - blackPoint, 0.001);
        let levels = max(uniforms.colorLevels, 2.0);
        let quantized = floor((remappedLum + (threshold - 0.5) * 0.5 / levels) * levels) / (levels - 1.0);
        outputColor = mix(bgColor, fgColor, clamp(quantized, 0.0, 1.0));
        // For tonal, use quantized value as foreground indicator
        isForeground = clamp(quantized, 0.0, 1.0);
      }
    }
    case 2u: { // indexed (palette) - use actual palette colors with dithering
      let palSize = u32(max(uniforms.paletteSize, 2.0));
      // Apply intensity to threshold for palette dithering
      // Intensity > 1 biases toward first color, < 1 biases toward second color
      let adjustedThreshold = clamp(threshold + intensityBias * 0.3, 0.0, 1.0);
      // Use adjusted color for palette matching so brightness/contrast/gamma affect output
      outputColor = ditherPaletteColor(adjustedColor, adjustedThreshold, palSize);
    }
    case 3u, 5u: { // rgb, color
      let levels = max(uniforms.colorLevels, 2.0);
      let ditherOffset = (threshold - 0.5) * 0.5 / levels;
      // Use original color for quantization (keeps colors pure)
      let quantized = floor((originalColor + vec3f(ditherOffset)) * (levels - 1.0) + 0.5) / (levels - 1.0);
      outputColor = clamp(quantized, vec3f(0.0), vec3f(1.0));
    }
    case 6u: { // original - keep original colors, use dithering as intensity mask
      // Dither between background and original color
      let dithered = step(threshold, lum);
      outputColor = mix(bgColor, originalColor, dithered);
    }
    default: {
      outputColor = originalColor;
    }
  }

  // Apply rounding/softening to dithered edges
  // This works by blending the dithered output with a softened version
  if (uniforms.rounding > 0.001) {
    // Since we can't re-sample our output, we blend toward the original luminance
    let softened = mix(outputColor, baseColor, uniforms.rounding * 0.5);
    outputColor = softened;
  }

  // Apply bleed effect
  if (uniforms.bleed > 0.001) {
    let offset = 1.0 / uniforms.resolution;
    let neighbor1 = textureSample(inputTexture, texSampler, pixelatedUV + vec2f(offset.x, 0.0)).rgb;
    let neighbor2 = textureSample(inputTexture, texSampler, pixelatedUV - vec2f(offset.x, 0.0)).rgb;
    let neighbor3 = textureSample(inputTexture, texSampler, pixelatedUV + vec2f(0.0, offset.y)).rgb;
    let neighbor4 = textureSample(inputTexture, texSampler, pixelatedUV - vec2f(0.0, offset.y)).rgb;
    let bleedColor = (neighbor1 + neighbor2 + neighbor3 + neighbor4) * 0.25;
    outputColor = mix(outputColor, bleedColor, uniforms.bleed);
  }

  // Apply post-processing effects to the dithered output
  outputColor = applyPostProcessing(outputColor, fragCoord, texCoord);

  return vec4f(outputColor, 1.0);
}
