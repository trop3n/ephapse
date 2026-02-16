struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct AsciiUniforms {
  sourceSize: vec2f,        // offset 0: Source image dimensions
  outputSize: vec2f,        // offset 8: Output canvas dimensions
  cellSize: vec2f,          // offset 16: Size of each ASCII cell in output pixels
  atlasSize: vec2f,         // offset 24: Font atlas dimensions
  atlasCharSize: vec2f,     // offset 32: Size of each character in atlas
  atlasCols: f32,           // offset 40: Number of columns in atlas
  charsetLength: f32,       // offset 44: Number of characters in charset
  brightness: f32,          // offset 48: Brightness adjustment (-100 to 100)
  contrast: f32,            // offset 52: Contrast adjustment (-100 to 100)
  invert: f32,              // offset 56: Invert brightness mapping (0 or 1)
  useOriginalColors: f32,   // offset 60: 0 = custom color, 1 = original colors
  customColorR: f32,        // offset 64: Custom color R (0-1)
  customColorG: f32,        // offset 68: Custom color G (0-1)
  customColorB: f32,        // offset 72: Custom color B (0-1)
  spacing: f32,             // offset 76: Spacing between characters
  saturation: f32,          // offset 80: Saturation adjustment (-100 to 100)
  hue: f32,                 // offset 84: Hue rotation (0 to 360)
  sharpness: f32,           // offset 88: Sharpness (0 to 100)
  gamma: f32,               // offset 92: Gamma correction (0.1 to 3)
  imageColorMode: f32,      // offset 96: 0=color, 1=grayscale, 2=monochrome, 3=sepia
  gridCols: f32,            // offset 100: Number of ASCII grid columns (for matchResult indexing)
  backgroundColorR: f32,    // offset 104: Background color R (0-1)
  backgroundColorG: f32,    // offset 108: Background color G (0-1)
  backgroundColorB: f32,    // offset 112: Background color B (0-1)
  brightnessMapping: f32,   // offset 116: Gamma for character mapping (0.1 to 2)
  edgeEnhance: f32,         // offset 120: Edge enhancement strength (0 to 100)
  blur: f32,                // offset 124: Blur amount (0 to 10)
  quantizeColors: f32,      // offset 128: Color quantization levels (0 = disabled, 2-256)
}

@group(0) @binding(0) var sourceSampler: sampler;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var fontAtlas: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: AsciiUniforms;
@group(0) @binding(4) var<storage, read> matchResult: array<u32>;

// OPTIMIZATION: Precomputed constants
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

// Helper function: RGB to HSL (optimized)
fn rgbToHsl(c: vec3f) -> vec3f {
  let maxC = max(max(c.r, c.g), c.b);
  let minC = min(min(c.r, c.g), c.b);
  let l = (maxC + minC) * 0.5;

  if (maxC == minC) {
    return vec3f(0.0, 0.0, l);
  }

  let d = maxC - minC;
  // OPTIMIZATION: Use select instead of ternary for branchless
  let s = select(d / (2.0 - maxC - minC), d / (maxC + minC), l > 0.5);

  var h: f32;
  if (maxC == c.r) {
    h = (c.g - c.b) / d + select(0.0, 6.0, c.g < c.b);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h = h * ONE_SIXTH;  // OPTIMIZATION: multiply instead of divide by 6

  return vec3f(h, s, l);
}

// Helper function: HSL to RGB (optimized)
fn hslToRgb(hsl: vec3f) -> vec3f {
  if (hsl.y == 0.0) {
    return vec3f(hsl.z);
  }

  // OPTIMIZATION: Use select for branchless
  let q = select(hsl.z + hsl.y - hsl.z * hsl.y, hsl.z * (1.0 + hsl.y), hsl.z < 0.5);
  let p = 2.0 * hsl.z - q;

  return vec3f(
    hueToRgb(p, q, hsl.x + ONE_THIRD),
    hueToRgb(p, q, hsl.x),
    hueToRgb(p, q, hsl.x - ONE_THIRD)
  );
}

fn hueToRgb(p: f32, q: f32, t_in: f32) -> f32 {
  var t = t_in;
  // OPTIMIZATION: branchless wrapping
  t = t - floor(t);  // equivalent to handling <0 and >1 cases

  // Early returns with select for most common paths
  if (t < ONE_SIXTH) { return p + (q - p) * 6.0 * t; }
  if (t < 0.5) { return q; }
  if (t < TWO_THIRDS) { return p + (q - p) * (TWO_THIRDS - t) * 6.0; }
  return p;
}

// Apply image processing to color (optimized)
fn applyImageProcessing(color: vec3f, invGamma: f32, brightnessOffset: f32, contrastFactor: f32, satFactor: f32, colorMode: i32) -> vec3f {
  var c = color;

  // Apply gamma correction (using precomputed inverse)
  c = pow(c, vec3f(invGamma));

  // Apply brightness adjustment (using precomputed offset)
  c = c + brightnessOffset;

  // Apply contrast adjustment (using precomputed factor)
  c = (c - 0.5) * contrastFactor + 0.5;

  // Apply saturation
  // OPTIMIZATION: Inline luma calculation
  let gray = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
  c = mix(vec3f(gray), c, satFactor);

  // Apply hue rotation only if needed
  if (uniforms.hue > 0.0) {
    let hsl = rgbToHsl(c);
    let newHue = fract(hsl.x + uniforms.hue * INV_360);
    c = hslToRgb(vec3f(newHue, hsl.y, hsl.z));
  }

  // Apply color mode transformations using integer comparison
  // OPTIMIZATION: Use integer switch instead of float comparisons
  if (colorMode == 1) {
    // Grayscale
    let grayVal = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
    c = vec3f(grayVal);
  } else if (colorMode == 2) {
    // Monochrome (high contrast black/white) - branchless
    let grayVal = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
    c = select(vec3f(0.0), vec3f(1.0), grayVal > 0.5);
  } else if (colorMode == 3) {
    // Sepia
    let grayVal = c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
    c = vec3f(grayVal * 1.2, grayVal, grayVal * 0.8);
  }

  return clamp(c, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  // OPTIMIZATION: Precompute frequently used values once
  let invCellSize = 1.0 / uniforms.cellSize;
  let invOutputSize = 1.0 / uniforms.outputSize;
  let invAtlasSize = 1.0 / uniforms.atlasSize;
  let texelSize = 1.0 / uniforms.sourceSize;

  // Precompute image processing parameters
  let invGamma = 1.0 / uniforms.gamma;
  let brightnessOffset = uniforms.brightness * INV_200;
  let contrastFactor = (uniforms.contrast + 100.0) * INV_100;
  let satFactor = (uniforms.saturation + 100.0) * INV_100;
  let colorMode = i32(uniforms.imageColorMode + 0.5);

  // Current pixel position in output
  let pixelPos = texCoord * uniforms.outputSize;

  // Which ASCII cell are we in?
  let cellPos = floor(pixelPos * invCellSize);

  // Position within the cell (0-1)
  let cellUV = fract(pixelPos * invCellSize);

  // Apply spacing - shrink the character area and add gaps
  let gapRatio = uniforms.spacing * 0.5;
  let charArea = 1.0 - gapRatio;
  let halfGap = gapRatio * 0.5;

  // OPTIMIZATION: Branchless gap check
  let inGapX = cellUV.x < halfGap || cellUV.x > (1.0 - halfGap);
  let inGapY = cellUV.y < halfGap || cellUV.y > (1.0 - halfGap);
  let inGap = inGapX || inGapY;

  // Remap cellUV to the character area
  // OPTIMIZATION: Precompute inverse charArea
  let invCharArea = 1.0 / charArea;
  let remappedUV = (cellUV - halfGap) * invCharArea;
  let clampedCellUV = saturate(remappedUV);  // OPTIMIZATION: saturate instead of clamp(x, 0, 1)

  // Calculate number of cells
  let numCells = floor(uniforms.outputSize * invCellSize);
  let invNumCells = 1.0 / numCells;

  // Sample the source image - map cell position directly to source UV
  let sourceUV = (cellPos + 0.5) * invNumCells;
  let clampedSourceUV = saturate(sourceUV);

  var sourceColor = textureSample(sourceTexture, sourceSampler, clampedSourceUV);

  // Apply blur (box blur) - only if enabled
  if (uniforms.blur > 0.0) {
    let blurRadius = uniforms.blur;
    var blurredColor = vec3f(0.0);
    // OPTIMIZATION: Unroll 5x5 kernel with precomputed reciprocal
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        let offset = vec2f(f32(dx), f32(dy)) * texelSize * blurRadius;
        blurredColor += textureSample(sourceTexture, sourceSampler, clampedSourceUV + offset).rgb;
      }
    }
    sourceColor = vec4f(blurredColor * INV_25, sourceColor.a);  // OPTIMIZATION: multiply by 1/25
  }

  // Apply edge enhancement (Laplacian-based) - only if enabled
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

  // Apply sharpness (unsharp mask) - only if enabled
  if (uniforms.sharpness > 0.0) {
    let blurSample = (
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(-texelSize.x, 0.0)).rgb +
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(texelSize.x, 0.0)).rgb +
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(0.0, -texelSize.y)).rgb +
      textureSample(sourceTexture, sourceSampler, clampedSourceUV + vec2f(0.0, texelSize.y)).rgb
    ) * 0.25;  // OPTIMIZATION: multiply instead of divide
    let sharpAmount = uniforms.sharpness * INV_100;
    sourceColor = vec4f(sourceColor.rgb + (sourceColor.rgb - blurSample) * sharpAmount, sourceColor.a);
  }

  // Apply color quantization (posterization) - only if enabled
  var processedRgb = sourceColor.rgb;
  if (uniforms.quantizeColors > 1.0) {
    let levels = uniforms.quantizeColors;
    let invLevelsMinus1 = 1.0 / (levels - 1.0);
    processedRgb = floor(processedRgb * levels) * invLevelsMinus1;
  }

  // Apply image processing with precomputed parameters
  let processedColor = applyImageProcessing(processedRgb, invGamma, brightnessOffset, contrastFactor, satFactor, colorMode);

  // Get character index from compute shader result
  let gridCols = u32(uniforms.gridCols);
  let cellIndex = u32(cellPos.y) * gridCols + u32(cellPos.x);
  let charIndex = matchResult[cellIndex];

  // Calculate atlas UV for this character
  let atlasColsU = u32(uniforms.atlasCols);
  let atlasCol = f32(charIndex % atlasColsU);
  let atlasRow = f32(charIndex / atlasColsU);

  // UV within the character cell in the atlas
  let atlasCharUV = vec2f(
    (atlasCol + clampedCellUV.x) * uniforms.atlasCharSize.x,
    (atlasRow + clampedCellUV.y) * uniforms.atlasCharSize.y
  ) * invAtlasSize;

  // Sample the font atlas
  let atlasColor = textureSample(fontAtlas, sourceSampler, atlasCharUV);

  // Character intensity (white = character, black = background)
  // OPTIMIZATION: Branchless gap handling using select
  let charIntensity = select(atlasColor.r, 0.0, inGap && uniforms.spacing > 0.01);

  // Determine final color using select (branchless)
  let customColor = vec3f(uniforms.customColorR, uniforms.customColorG, uniforms.customColorB);
  let finalColor = select(customColor, processedColor, uniforms.useOriginalColors > 0.5);

  // Apply character mask with background color
  let backgroundColor = vec3f(uniforms.backgroundColorR, uniforms.backgroundColorG, uniforms.backgroundColorB);
  let outputColor = mix(backgroundColor, finalColor, charIntensity);

  return vec4f(outputColor, 1.0);
}
