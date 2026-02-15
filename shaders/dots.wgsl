
  NS = `
${ta}

struct DotsUniforms {
  resolution: vec2f,       // offset 0
  sizeMultiplier: f32,     // offset 8: 0.5 - 2.0
  spacing: f32,            // offset 12: 0.5 - 2.0
  shape: f32,              // offset 16: 0 = circle, 1 = square, 2 = diamond
  gridType: f32,           // offset 20: 0 = square grid, 1 = hex grid
  brightness: f32,         // offset 24
  contrast: f32,           // offset 28
  bgColorR: f32,           // offset 32
  bgColorG: f32,           // offset 36
  bgColorB: f32,           // offset 40
  colorMode: f32,          // offset 44: 0 = original colors, 1 = grayscale, 2 = custom
  fgColorR: f32,           // offset 48
  fgColorG: f32,           // offset 52
  fgColorB: f32,           // offset 56
  invert: f32,             // offset 60
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: DotsUniforms;

// OPTIMIZATION: Precomputed constants
const LUMA_R: f32 = 0.299;
const LUMA_G: f32 = 0.587;
const LUMA_B: f32 = 0.114;
const HEX_RATIO: f32 = 0.866;  // sqrt(3)/2 for hex grid
const DIAMOND_SCALE: f32 = 1.4;

fn luminance(c: vec3f) -> f32 {
  return c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
}

fn applyBrightnessContrast(color: vec3f, brightnessOffset: f32, contrastFactor: f32) -> vec3f {
  // OPTIMIZATION: Precompute contrastFactor in caller, remove division
  let result = (color + brightnessOffset - 0.5) * contrastFactor + 0.5;
  return saturate(result);  // OPTIMIZATION: saturate instead of clamp(x, 0, 1)
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  // OPTIMIZATION: Precompute values used multiple times
  let baseSpacing = 8.0 * uniforms.spacing;
  let invBaseSpacing = 1.0 / baseSpacing;
  let dotRadius = baseSpacing * 0.4 * uniforms.sizeMultiplier;
  let invResolution = 1.0 / uniforms.resolution;

  // OPTIMIZATION: Precompute contrast factor once
  let contrastFactor = (1.0 + uniforms.contrast) / (1.0 - uniforms.contrast * 0.99);

  // OPTIMIZATION: Precompute boolean flags as f32 for branchless ops
  let isHexGrid = uniforms.gridType > 0.5;
  let doInvert = uniforms.invert > 0.5;
  let shapeInt = i32(uniforms.shape + 0.5);
  let colorModeInt = i32(uniforms.colorMode + 0.5);

  let pixelPos = texCoord * uniforms.resolution;

  var cellCenter: vec2f;

  if (isHexGrid) {
    // Hex grid - OPTIMIZATION: precompute hex constants
    let hexSpacingY = baseSpacing * HEX_RATIO;
    let invHexSpacingY = 1.0 / hexSpacingY;
    let row = floor(pixelPos.y * invHexSpacingY);
    let isOddRow = (i32(row) & 1) == 1;  // OPTIMIZATION: bitwise AND instead of modulo
    let xOffset = select(0.0, baseSpacing * 0.5, isOddRow);
    let cellX = floor((pixelPos.x - xOffset) * invBaseSpacing);
    cellCenter = vec2f(
      (cellX + 0.5) * baseSpacing + xOffset,
      (row + 0.5) * hexSpacingY
    );
  } else {
    // Square grid
    let cellPos = floor(pixelPos * invBaseSpacing);
    cellCenter = (cellPos + 0.5) * baseSpacing;
  }

  let cellUV = cellCenter * invResolution;

  // Sample color at cell center
  var color = textureSample(inputTexture, texSampler, cellUV).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, contrastFactor);

  var luma = luminance(color);

  // OPTIMIZATION: Branchless invert using select
  luma = select(luma, 1.0 - luma, doInvert);

  // Distance from cell center (for circle check)
  let localPos = pixelPos - cellCenter;
  let absLocalX = abs(localPos.x);
  let absLocalY = abs(localPos.y);

  // Size varies by brightness
  let radius = dotRadius * (0.2 + luma * 0.8);
  let radiusSq = radius * radius;  // OPTIMIZATION: For circle, compare squared distances

  // OPTIMIZATION: Branchless shape check using select chains
  // Circle: distSq < radiusSq
  // Square: max(absX, absY) < radius
  // Diamond: (absX + absY) < radius * 1.4
  let distSq = localPos.x * localPos.x + localPos.y * localPos.y;
  let circleCheck = distSq < radiusSq;
  let squareCheck = max(absLocalX, absLocalY) < radius;
  let diamondCheck = (absLocalX + absLocalY) < radius * DIAMOND_SCALE;

  // OPTIMIZATION: Branchless shape selection
  let inShape = select(
    select(circleCheck, squareCheck, shapeInt == 1),
    diamondCheck,
    shapeInt == 2
  );

  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);

  // OPTIMIZATION: Branchless final color selection
  // Compute all possible colors, then select based on conditions
  let grayscaleColor = vec3f(luma);
  let customColor = fgColor * luma;

  // Select dot color based on mode
  let dotColor = select(
    select(color, grayscaleColor, colorModeInt == 1),
    customColor,
    colorModeInt == 2
  );

  // Select between background and dot color
  let finalColor = select(bgColor, dotColor, inShape);

  return vec4f(finalColor, 1.0);
}
