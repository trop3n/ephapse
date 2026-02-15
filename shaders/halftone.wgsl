
  zS = `
${ta}

struct HalftoneUniforms {
  resolution: vec2f,       // offset 0
  dotScale: f32,           // offset 8: 0.5 - 2.0, multiplier for dot size
  angle: f32,              // offset 12: rotation angle in radians (base offset)
  shape: f32,              // offset 16: 0 = circle, 1 = square, 2 = diamond, 3 = line
  spacing: f32,            // offset 20: 4 - 20, distance between dots
  invert: f32,             // offset 24: 0 or 1
  colorMode: f32,          // offset 28: 0 = bw, 1 = color, 2 = cmyk
  bgColorR: f32,           // offset 32
  bgColorG: f32,           // offset 36
  bgColorB: f32,           // offset 40
  fgColorR: f32,           // offset 44
  fgColorG: f32,           // offset 48
  fgColorB: f32,           // offset 52
  brightness: f32,         // offset 56
  contrast: f32,           // offset 60
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: HalftoneUniforms;

const PI: f32 = 3.14159265359;

// ============================================
// Simplex noise for paper texture (Ian McEwan, Ashima Arts)
// ============================================
fn mod289_3(x: vec3f) -> vec3f {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_2(x: vec2f) -> vec2f {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x: vec3f) -> vec3f {
  return mod289_3(((x * 34.0) + 1.0) * x);
}

fn snoise(v: vec2f) -> f32 {
  let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);

  var i = floor(v + dot(v, C.yy));
  let x0 = v - i + dot(i, C.xx);

  var i1: vec2f;
  if (x0.x > x0.y) {
    i1 = vec2f(1.0, 0.0);
  } else {
    i1 = vec2f(0.0, 1.0);
  }

  var x12 = x0.xyxy + C.xxzz;
  x12 = vec4f(x12.xy - i1, x12.zw);

  i = mod289_2(i);
  let p = permute(permute(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));

  var m = max(vec3f(0.5) - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));
  m = m * m;
  m = m * m;

  let x = 2.0 * fract(p * C.www) - 1.0;
  let h = abs(x) - 0.5;
  let ox = floor(x + 0.5);
  let a0 = x - ox;

  m = m * (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h));

  let g0 = a0.x * x0.x + h.x * x0.y;
  let g1 = a0.y * x12.x + h.y * x12.y;
  let g2 = a0.z * x12.z + h.z * x12.w;

  return 130.0 * dot(m, vec3f(g0, g1, g2));
}

// ============================================
// Anti-aliased step function using derivatives
// Based on Stefan Gustavson's aastep
// ============================================
fn aastep(threshold: f32, value: f32) -> f32 {
  // Attempt to approximate screen-space derivatives
  // In WebGPU we use fwidth-like approach
  let afwidth = 0.7 * length(vec2f(dpdx(value), dpdy(value)));
  return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

// OPTIMIZATION: Precomputed constants
const LUMA_R: f32 = 0.299;
const LUMA_G: f32 = 0.587;
const LUMA_B: f32 = 0.114;
const INV_289: f32 = 0.00346020761;  // 1/289

fn luminance(c: vec3f) -> f32 {
  return c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
}

fn applyBrightnessContrast(color: vec3f, brightnessOffset: f32, contrastFactor: f32) -> vec3f {
  // OPTIMIZATION: Precompute contrastFactor in caller
  let result = (color + brightnessOffset - 0.5) * contrastFactor + 0.5;
  return saturate(result);  // OPTIMIZATION: saturate instead of clamp
}

// ============================================
// Halftone pattern for a single channel
// Returns the "ink coverage" (0 = no ink, 1 = full ink)
// ============================================
fn halftonePattern(fragCoord: vec2f, frequency: f32, angle: f32, value: f32, shape: i32) -> f32 {
  // Rotate coordinates by screen angle
  let s = sin(angle);
  let c = cos(angle);
  let rotated = vec2f(
    fragCoord.x * c - fragCoord.y * s,
    fragCoord.x * s + fragCoord.y * c
  );

  // Scale to grid frequency
  let scaled = rotated * frequency;

  // Distance to nearest grid point
  let nearest = scaled - floor(scaled) - 0.5;

  // Calculate distance based on shape
  var dist: f32;
  if (shape == 0) {
    // Circle
    dist = length(nearest);
  } else if (shape == 1) {
    // Square
    dist = max(abs(nearest.x), abs(nearest.y));
  } else if (shape == 2) {
    // Diamond
    dist = abs(nearest.x) + abs(nearest.y);
  } else {
    // Line
    dist = abs(nearest.y);
  }

  // The threshold is based on the ink value
  // Darker values (more ink) = larger dots = higher threshold
  // We use sqrt for perceptual linearity
  let radius = sqrt(value) * 0.5;

  // Anti-aliased comparison
  return aastep(radius, dist);
}

// ============================================
// RGB to CMYK conversion
// ============================================
fn rgbToCmyk(rgb: vec3f) -> vec4f {
  // CMY = 1 - RGB
  var cmy = vec3f(1.0) - rgb;

  // K (black) = minimum of CMY
  let k = min(min(cmy.r, cmy.g), cmy.b);

  // Grey component replacement - subtract black from CMY
  if (k < 1.0) {
    cmy = (cmy - k) / (1.0 - k);
  } else {
    cmy = vec3f(0.0);
  }

  return vec4f(cmy, k);
}

// ============================================
// CMYK to RGB conversion
// ============================================
fn cmykToRgb(cmyk: vec4f) -> vec3f {
  let cmy = cmyk.rgb * (1.0 - cmyk.a) + cmyk.a;
  return vec3f(1.0) - cmy;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  // OPTIMIZATION: Precompute values used multiple times
  let contrastFactor = (1.0 + uniforms.contrast) / (1.0 - uniforms.contrast * 0.99);
  let frequency = 1.0 / uniforms.spacing;
  let shapeInt = i32(uniforms.shape + 0.5);
  let doInvert = uniforms.invert > 0.5;
  let isCmykMode = uniforms.colorMode > 1.5;
  let isColorMode = uniforms.colorMode > 0.5;

  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, contrastFactor);

  let fragCoord = texCoord * uniforms.resolution;

  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);

  // Add paper texture using simplex noise (3 octaves)
  // OPTIMIZATION: Precompute scaled coordinates
  let paperNoise = (snoise(fragCoord * 0.1) * 0.5 +
                    snoise(fragCoord * 0.2) * 0.25 +
                    snoise(fragCoord * 0.4) * 0.125) * 0.02 * uniforms.dotScale;

  // CMYK mode - full color separation with proper screen angles
  if (isCmykMode) {
    let cmyk = rgbToCmyk(color);

    // OPTIMIZATION: Precompute angles once (radians are compile-time constants)
    let cAngle = uniforms.angle + 0.2617994;  // radians(15)
    let mAngle = uniforms.angle + 1.3089969;  // radians(75)
    let yAngle = uniforms.angle;              // radians(0) = 0
    let kAngle = uniforms.angle + 0.7853982;  // radians(45)

    // Apply halftone to each channel
    let cPattern = halftonePattern(fragCoord, frequency, cAngle, cmyk.x + paperNoise, shapeInt);
    let mPattern = halftonePattern(fragCoord, frequency, mAngle, cmyk.y + paperNoise, shapeInt);
    let yPattern = halftonePattern(fragCoord, frequency, yAngle, cmyk.z + paperNoise, shapeInt);
    let kPattern = halftonePattern(fragCoord, frequency * 1.1, kAngle, cmyk.w + paperNoise, shapeInt);

    // OPTIMIZATION: Branchless invert using select
    let patterns = vec4f(cPattern, mPattern, yPattern, kPattern);
    let finalCmyk = select(vec4f(1.0) - patterns, patterns, doInvert);

    let result = cmykToRgb(finalCmyk);
    return vec4f(result, 1.0);
  }

  // Standard monochrome or color halftone
  var lum = luminance(color);

  // OPTIMIZATION: Branchless invert
  lum = select(lum, 1.0 - lum, doInvert);

  // Apply halftone pattern
  let pattern = halftonePattern(fragCoord, frequency, uniforms.angle, lum + paperNoise, shapeInt);

  // OPTIMIZATION: Branchless color selection
  // pattern = 1 means paper (background), pattern = 0 means ink (foreground)
  let colorModeResult = mix(color, bgColor, pattern);
  let bwModeResult = mix(fgColor, bgColor, pattern);
  let finalColor = select(bwModeResult, colorModeResult, isColorMode);

  return vec4f(finalColor, 1.0);
}
