
  FS = `
${ta}

struct EdgeUniforms {
  resolution: vec2f,       // offset 0
  threshold: f32,          // offset 8: 0.1 - 0.8, sensitivity
  lineWidth: f32,          // offset 12: 0.5 - 4.0, edge thickness
  invert: f32,             // offset 16: 0 or 1
  algorithm: f32,          // offset 20: 0 = sobel, 1 = prewitt, 2 = laplacian
  brightness: f32,         // offset 24
  contrast: f32,           // offset 28
  edgeColorR: f32,         // offset 32
  edgeColorG: f32,         // offset 36
  edgeColorB: f32,         // offset 40
  bgColorR: f32,           // offset 44
  bgColorG: f32,           // offset 48
  bgColorB: f32,           // offset 52
  colorMode: f32,          // offset 56: 0 = custom, 1 = original color edges
  _pad: vec3f,             // padding
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: EdgeUniforms;

// OPTIMIZATION: Precomputed constants
const LUMA_R: f32 = 0.299;
const LUMA_G: f32 = 0.587;
const LUMA_B: f32 = 0.114;

fn luminance(c: vec3f) -> f32 {
  return c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
}

fn applyBrightnessContrast(color: vec3f, brightnessOffset: f32, contrastFactor: f32) -> vec3f {
  // OPTIMIZATION: Precompute contrastFactor in caller
  let result = (color + brightnessOffset - 0.5) * contrastFactor + 0.5;
  return saturate(result);  // OPTIMIZATION: saturate instead of clamp
}

fn sampleLuminance(uv: vec2f, brightnessOffset: f32, contrastFactor: f32) -> f32 {
  let color = textureSample(inputTexture, texSampler, uv).rgb;
  return luminance(applyBrightnessContrast(color, brightnessOffset, contrastFactor));
}

// OPTIMIZATION: Precomputed Gaussian kernel weights (sigma ≈ 0.85)
const GAUSS_CORNER: f32 = 0.0625;
const GAUSS_EDGE: f32 = 0.125;
const GAUSS_CENTER: f32 = 0.25;

// Gaussian blur for noise reduction (Canny-inspired pre-processing)
fn gaussianBlurLuminance(uv: vec2f, pixelSize: vec2f, brightnessOffset: f32, contrastFactor: f32) -> f32 {
  // OPTIMIZATION: Precompute all offsets
  let nps = -pixelSize;
  let pps = pixelSize;

  return sampleLuminance(uv + vec2f(nps.x, nps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER +
         sampleLuminance(uv + vec2f(0.0, nps.y), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv + vec2f(pps.x, nps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER +
         sampleLuminance(uv + vec2f(nps.x, 0.0), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv, brightnessOffset, contrastFactor) * GAUSS_CENTER +
         sampleLuminance(uv + vec2f(pps.x, 0.0), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv + vec2f(nps.x, pps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER +
         sampleLuminance(uv + vec2f(0.0, pps.y), brightnessOffset, contrastFactor) * GAUSS_EDGE +
         sampleLuminance(uv + vec2f(pps.x, pps.y), brightnessOffset, contrastFactor) * GAUSS_CORNER;
}

// Sample blurred luminance for edge detection
fn sampleBlurred(uv: vec2f, pixelSize: vec2f, brightnessOffset: f32, contrastFactor: f32) -> f32 {
  return gaussianBlurLuminance(uv, pixelSize, brightnessOffset, contrastFactor);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  // OPTIMIZATION: Precompute values used multiple times
  let contrastFactor = (1.0 + uniforms.contrast) / (1.0 - uniforms.contrast * 0.99);
  let brightnessOffset = uniforms.brightness;
  let pixelSize = uniforms.lineWidth / uniforms.resolution;
  let algoInt = i32(uniforms.algorithm + 0.5);
  let doInvert = uniforms.invert > 0.5;
  let useOriginalColor = uniforms.colorMode > 0.5;

  let originalColor = textureSample(inputTexture, texSampler, texCoord).rgb;

  // OPTIMIZATION: Precompute offsets
  let nps = -pixelSize;
  let pps = pixelSize;

  // Sample 3x3 neighborhood with Gaussian pre-blur for noise reduction
  let tl = sampleBlurred(texCoord + vec2f(nps.x, nps.y), pixelSize, brightnessOffset, contrastFactor);
  let tc = sampleBlurred(texCoord + vec2f(0.0, nps.y), pixelSize, brightnessOffset, contrastFactor);
  let tr = sampleBlurred(texCoord + vec2f(pps.x, nps.y), pixelSize, brightnessOffset, contrastFactor);
  let ml = sampleBlurred(texCoord + vec2f(nps.x, 0.0), pixelSize, brightnessOffset, contrastFactor);
  let mc = sampleBlurred(texCoord, pixelSize, brightnessOffset, contrastFactor);
  let mr = sampleBlurred(texCoord + vec2f(pps.x, 0.0), pixelSize, brightnessOffset, contrastFactor);
  let bl = sampleBlurred(texCoord + vec2f(nps.x, pps.y), pixelSize, brightnessOffset, contrastFactor);
  let bc = sampleBlurred(texCoord + vec2f(0.0, pps.y), pixelSize, brightnessOffset, contrastFactor);
  let br = sampleBlurred(texCoord + vec2f(pps.x, pps.y), pixelSize, brightnessOffset, contrastFactor);

  var gx: f32;
  var gy: f32;
  var edge: f32;

  if (algoInt == 1) {
    // Prewitt operator - equal weighting
    gx = -tl - ml - bl + tr + mr + br;
    gy = -tl - tc - tr + bl + bc + br;
    // OPTIMIZATION: Could skip sqrt for relative comparisons, but we need actual magnitude
    edge = sqrt(gx * gx + gy * gy);
  } else if (algoInt == 2) {
    // Laplacian of Gaussian (LoG approximation)
    let center = mc * 8.0;
    let neighbors = tl + tc + tr + ml + mr + bl + bc + br;
    edge = abs(center - neighbors);
  } else {
    // Sobel operator (default)
    gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    edge = sqrt(gx * gx + gy * gy);
  }

  // Multi-scale edge detection - combine fine and coarse scales
  let finePixelSize = pixelSize * 0.5;
  let fnps = -finePixelSize;
  let fpps = finePixelSize;

  let fineTl = sampleBlurred(texCoord + vec2f(fnps.x, fnps.y), finePixelSize, brightnessOffset, contrastFactor);
  let fineTc = sampleBlurred(texCoord + vec2f(0.0, fnps.y), finePixelSize, brightnessOffset, contrastFactor);
  let fineTr = sampleBlurred(texCoord + vec2f(fpps.x, fnps.y), finePixelSize, brightnessOffset, contrastFactor);
  let fineMl = sampleBlurred(texCoord + vec2f(fnps.x, 0.0), finePixelSize, brightnessOffset, contrastFactor);
  let fineMr = sampleBlurred(texCoord + vec2f(fpps.x, 0.0), finePixelSize, brightnessOffset, contrastFactor);
  let fineBl = sampleBlurred(texCoord + vec2f(fnps.x, fpps.y), finePixelSize, brightnessOffset, contrastFactor);
  let fineBc = sampleBlurred(texCoord + vec2f(0.0, fpps.y), finePixelSize, brightnessOffset, contrastFactor);
  let fineBr = sampleBlurred(texCoord + vec2f(fpps.x, fpps.y), finePixelSize, brightnessOffset, contrastFactor);

  var fineEdge: f32;
  if (algoInt == 2) {
    let fineMc = sampleBlurred(texCoord, finePixelSize, brightnessOffset, contrastFactor);
    let fineCenter = fineMc * 8.0;
    let fineNeighbors = fineTl + fineTc + fineTr + fineMl + fineMr + fineBl + fineBc + fineBr;
    fineEdge = abs(fineCenter - fineNeighbors);
  } else {
    let fineGx = -fineTl - 2.0 * fineMl - fineBl + fineTr + 2.0 * fineMr + fineBr;
    let fineGy = -fineTl - 2.0 * fineTc - fineTr + fineBl + 2.0 * fineBc + fineBr;
    fineEdge = sqrt(fineGx * fineGx + fineGy * fineGy);
  }

  // Combine multi-scale edges
  let combinedEdge = max(edge, fineEdge * 0.7);

  // Anti-aliased edge thresholding using smoothstep
  let edgeSoftness = uniforms.threshold * 0.3;
  let edgeIntensity = smoothstep(uniforms.threshold - edgeSoftness, uniforms.threshold + edgeSoftness, combinedEdge);

  // OPTIMIZATION: Branchless inversion using select
  let finalIntensity = select(edgeIntensity, 1.0 - edgeIntensity, doInvert);

  let edgeColor = vec3f(uniforms.edgeColorR, uniforms.edgeColorG, uniforms.edgeColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  // OPTIMIZATION: Branchless color selection
  let processedOriginal = applyBrightnessContrast(originalColor, brightnessOffset, contrastFactor);
  let originalColorResult = mix(bgColor, processedOriginal, finalIntensity);
  let customColorResult = mix(bgColor, edgeColor, finalIntensity);
  let finalColor = select(customColorResult, originalColorResult, useOriginalColor);

  return vec4f(finalColor, 1.0);
}
