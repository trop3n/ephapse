
  IS = `
${ta}

struct CrosshatchUniforms {
  resolution: vec2f,       // offset 0
  density: f32,            // offset 8: 2 - 12, line spacing
  angle: f32,              // offset 12: 0 - 90 degrees (radians)
  layers: f32,             // offset 16: 1 - 4, number of hatch directions
  lineWidth: f32,          // offset 20: 0.05 - 0.3
  brightness: f32,         // offset 24
  contrast: f32,           // offset 28
  invert: f32,             // offset 32: 0 or 1
  fgColorR: f32,           // offset 36
  fgColorG: f32,           // offset 40
  fgColorB: f32,           // offset 44
  bgColorR: f32,           // offset 48
  bgColorG: f32,           // offset 52
  bgColorB: f32,           // offset 56
  randomness: f32,         // offset 60: 0 - 1, adds organic variation
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: CrosshatchUniforms;

const PI: f32 = 3.14159265359;

fn luminance(c: vec3f) -> f32 {
  // Using standard luminosity coefficients (matches TAM paper)
  return dot(c, vec3f(0.2326, 0.7152, 0.0722));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

// ============================================
// Hash functions for organic variation
// ============================================
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash21(i), hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// ============================================
// Procedural hatch pattern generator
// Each level adds more strokes (TAM principle: darker = more strokes)
// ============================================
fn hatchPattern(uv: vec2f, angle: f32, spacing: f32, width: f32, seed: f32) -> f32 {
  let s = sin(angle);
  let c = cos(angle);

  // Rotate coordinates
  let rotatedX = uv.x * c - uv.y * s;
  let rotatedY = uv.x * s + uv.y * c;

  // Scale to line frequency
  let scaledX = rotatedX * uniforms.resolution.x / spacing;

  // Add organic wobble
  var wobble = 0.0;
  if (uniforms.randomness > 0.0) {
    let noiseCoord = vec2f(floor(scaledX) * 0.1 + seed * 7.0, rotatedY * 0.02);
    wobble = (valueNoise(noiseCoord * 3.0) - 0.5) * uniforms.randomness * 0.4;
  }

  // Calculate distance to nearest line
  let linePos = fract(scaledX + wobble);
  let distToLine = abs(linePos - 0.5);

  // Anti-aliased line using smoothstep
  let halfWidth = width * 0.5;
  let aa = 1.5 / uniforms.resolution.x;

  // Line intensity (1.0 = on line, 0.0 = off line)
  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, distToLine);
}

// ============================================
// TAM-style weight calculation
// Based on Kyle Halladay's technique: multiply intensity by 6,
// then calculate weights that smoothly blend between adjacent levels
// This avoids GPU-unfriendly branching
// ============================================
fn calculateTamWeights(intensity: f32) -> array<f32, 6> {
  var weights: array<f32, 6>;

  // Scale intensity to 0-6 range
  let i = intensity * 6.0;

  // Calculate raw weights (how much each level contributes)
  // Each weight peaks at its corresponding integer value
  let w0 = saturate(i);
  let w1 = saturate(i - 1.0);
  let w2 = saturate(i - 2.0);
  let w3 = saturate(i - 3.0);
  let w4 = saturate(i - 4.0);
  let w5 = saturate(i - 5.0);

  // Convert to individual level weights
  // Level 0 is active from intensity 0-1, level 1 from 1-2, etc.
  weights[0] = w0 - w1;  // Active 0-1
  weights[1] = w1 - w2;  // Active 1-2
  weights[2] = w2 - w3;  // Active 2-3
  weights[3] = w3 - w4;  // Active 3-4
  weights[4] = w4 - w5;  // Active 4-5
  weights[5] = w5;       // Active 5-6

  return weights;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  var lum = luminance(color);

  if (uniforms.invert > 0.5) {
    lum = 1.0 - lum;
  }

  // Darkness = how much hatching we need (0 = white/no hatch, 1 = black/full hatch)
  let darkness = 1.0 - lum;

  let spacing = uniforms.density;
  let width = uniforms.lineWidth;
  let baseAngle = uniforms.angle;

  // ============================================
  // Generate 6 TAM levels with progressive hatching
  // Each level includes all strokes from previous levels plus new ones
  // ============================================

  // Level 0: Lightest - single direction, sparse
  let hatch0 = hatchPattern(texCoord, baseAngle, spacing * 1.5, width * 0.7, 0.0);

  // Level 1: Add perpendicular direction
  let hatch1_new = hatchPattern(texCoord, baseAngle + PI * 0.5, spacing * 1.5, width * 0.7, 1.0);
  let hatch1 = max(hatch0, hatch1_new);

  // Level 2: Tighten spacing on primary direction
  let hatch2_new = hatchPattern(texCoord, baseAngle, spacing, width * 0.8, 2.0);
  let hatch2 = max(hatch1, hatch2_new);

  // Level 3: Tighten spacing on secondary direction
  let hatch3_new = hatchPattern(texCoord, baseAngle + PI * 0.5, spacing, width * 0.8, 3.0);
  let hatch3 = max(hatch2, hatch3_new);

  // Level 4: Add diagonal hatching
  let hatch4_new = hatchPattern(texCoord, baseAngle + PI * 0.25, spacing * 0.85, width * 0.9, 4.0);
  let hatch4 = max(hatch3, hatch4_new);

  // Level 5: Densest - add opposite diagonal
  let hatch5_new = hatchPattern(texCoord, baseAngle + PI * 0.75, spacing * 0.85, width * 0.9, 5.0);
  let hatch5 = max(hatch4, hatch5_new);

  // Apply layer limit from uniforms
  var level0 = hatch0;
  var level1 = hatch1;
  var level2 = hatch2;
  var level3 = hatch3;
  var level4 = hatch4;
  var level5 = hatch5;

  if (uniforms.layers < 2.0) {
    // Only primary direction
    level1 = level0;
    level2 = level0;
    level3 = level0;
    level4 = level0;
    level5 = level0;
  } else if (uniforms.layers < 3.0) {
    // Primary + perpendicular
    level4 = level3;
    level5 = level3;
  } else if (uniforms.layers < 4.0) {
    // Primary + perpendicular + one diagonal
    level5 = level4;
  }

  // ============================================
  // TAM-style blending using weights
  // ============================================
  let weights = calculateTamWeights(darkness);

  // Blend hatch levels based on weights
  var hatchValue = 0.0;
  hatchValue += level0 * weights[0];
  hatchValue += level1 * weights[1];
  hatchValue += level2 * weights[2];
  hatchValue += level3 * weights[3];
  hatchValue += level4 * weights[4];
  hatchValue += level5 * weights[5];

  // Very dark areas get solid fill
  let solidFill = smoothstep(0.92, 1.0, darkness);
  hatchValue = max(hatchValue, solidFill);

  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  // Final output
  let finalColor = mix(bgColor, fgColor, hatchValue);
  return vec4f(finalColor, 1.0);
}
