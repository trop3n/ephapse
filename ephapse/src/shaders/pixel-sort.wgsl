
  GS = `
${ta}

struct PixelSortUniforms {
  resolution: vec2f,
  threshold: f32,        // Threshold value for span detection (0-1)
  direction: f32,        // 0=horizontal, 1=vertical, 2=diagonal
  mode: f32,             // 0=black, 1=white, 2=bright, 3=dark (Kim Asendorf modes)
  streakLength: f32,     // Maximum streak length in pixels
  intensity: f32,        // Blend with original (0-1)
  randomness: f32,       // Per-line variation (0-1)
  reverse: f32,          // Reverse sort direction (0 or 1)
  brightness: f32,
  contrast: f32,
  _pad: vec3f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: PixelSortUniforms;

const SAMPLE_COUNT: u32 = 24u;

// ============================================
// Utility functions
// ============================================
fn hash11(p: f32) -> f32 {
  var p2 = fract(p * 0.1031);
  p2 = p2 * (p2 + 33.33);
  return fract(p2 * (p2 + p2));
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn brightness(c: vec3f) -> f32 {
  // Kim Asendorf uses max of RGB for brightness
  return max(max(c.r, c.g), c.b);
}

fn applyBrightnessContrast(color: vec3f, brt: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brt);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

// ============================================
// Kim Asendorf's span detection modes
// Returns true if pixel should START a span (is "not X" in his terminology)
// ============================================
fn isSpanStart(color: vec3f, threshold: f32, mode: f32) -> bool {
  let modeInt = i32(mode + 0.5);

  if (modeInt == 0) {
    // Mode 0: Black mode - span starts when pixel is NOT black
    // "getFirstNotBlackX" - finds first pixel brighter than black threshold
    let blackThreshold = threshold * 0.25; // Black is typically very dark
    return luminance(color) > blackThreshold;
  } else if (modeInt == 1) {
    // Mode 1: White mode - span starts when pixel is NOT white
    // "getFirstNotWhiteX" - finds first pixel darker than white threshold
    let whiteThreshold = 1.0 - threshold * 0.25;
    return luminance(color) < whiteThreshold;
  } else if (modeInt == 2) {
    // Mode 2: Bright mode - span starts when pixel IS bright enough
    // "getFirstBrightX" - finds first bright pixel
    return brightness(color) > threshold;
  } else {
    // Mode 3: Dark mode - span starts when pixel IS dark enough
    // "getFirstDarkX" - finds first dark pixel
    return brightness(color) < threshold;
  }
}

// Returns true if pixel should END a span
fn isSpanEnd(color: vec3f, threshold: f32, mode: f32) -> bool {
  let modeInt = i32(mode + 0.5);

  if (modeInt == 0) {
    // Mode 0: Black mode - span ends when we hit black
    let blackThreshold = threshold * 0.25;
    return luminance(color) <= blackThreshold;
  } else if (modeInt == 1) {
    // Mode 1: White mode - span ends when we hit white
    let whiteThreshold = 1.0 - threshold * 0.25;
    return luminance(color) >= whiteThreshold;
  } else if (modeInt == 2) {
    // Mode 2: Bright mode - span ends when pixel is NOT bright
    return brightness(color) <= threshold;
  } else {
    // Mode 3: Dark mode - span ends when pixel is NOT dark
    return brightness(color) >= threshold;
  }
}

// Get the sort value for a pixel (luminance-based)
fn getSortValue(color: vec3f) -> f32 {
  return luminance(color);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;
  let pixel = texCoord * uniforms.resolution;

  // Direction setup (matching Kim Asendorf's row/column approach)
  var dir: vec2f;
  var lineCoord: f32;

  if (uniforms.direction > 1.5) {
    // Diagonal
    dir = normalize(vec2f(1.0, 1.0));
    lineCoord = floor(pixel.x - pixel.y);
  } else if (uniforms.direction > 0.5) {
    // Vertical (column sorting)
    dir = vec2f(0.0, 1.0);
    lineCoord = floor(pixel.x);
  } else {
    // Horizontal (row sorting)
    dir = vec2f(1.0, 0.0);
    lineCoord = floor(pixel.y);
  }

  // Per-line randomization for organic variation
  let lineRand = hash11(lineCoord * 0.173);
  let thresholdVar = uniforms.threshold * (1.0 + (lineRand - 0.5) * uniforms.randomness * 0.5);

  // Sample current pixel
  let currentColor = textureSampleLevel(inputTexture, texSampler, texCoord, 0.0).rgb;

  // Check if current pixel is within a sortable span
  if (!isSpanStart(currentColor, thresholdVar, uniforms.mode)) {
    // Not in a span - return original
    return vec4f(applyBrightnessContrast(currentColor, uniforms.brightness, uniforms.contrast), 1.0);
  }

  let dirNorm = dir * pixelSize;
  let maxSteps = i32(uniforms.streakLength);

  // ============================================
  // Find span boundaries (Kim Asendorf's approach)
  // Search backward for span start
  // ============================================
  var spanStartDist: i32 = 0;
  for (var i = 1; i <= maxSteps; i = i + 1) {
    let checkUV = texCoord - dirNorm * f32(i);

    // Check bounds
    if (checkUV.x < 0.0 || checkUV.x > 1.0 || checkUV.y < 0.0 || checkUV.y > 1.0) {
      spanStartDist = i;
      break;
    }

    let checkColor = textureSampleLevel(inputTexture, texSampler, checkUV, 0.0).rgb;

    // If this pixel would NOT be in span, previous pixel was span start
    if (!isSpanStart(checkColor, thresholdVar, uniforms.mode)) {
      spanStartDist = i;
      break;
    }

    // Check for span end condition (different from span start)
    if (isSpanEnd(checkColor, thresholdVar, uniforms.mode)) {
      spanStartDist = i;
      break;
    }

    spanStartDist = i;
  }

  // ============================================
  // Search forward for span end
  // ============================================
  var spanEndDist: i32 = 0;
  for (var i = 1; i <= maxSteps; i = i + 1) {
    let checkUV = texCoord + dirNorm * f32(i);

    // Check bounds
    if (checkUV.x < 0.0 || checkUV.x > 1.0 || checkUV.y < 0.0 || checkUV.y > 1.0) {
      spanEndDist = i;
      break;
    }

    let checkColor = textureSampleLevel(inputTexture, texSampler, checkUV, 0.0).rgb;

    // If this pixel is span end or not in span
    if (isSpanEnd(checkColor, thresholdVar, uniforms.mode) || !isSpanStart(checkColor, thresholdVar, uniforms.mode)) {
      spanEndDist = i;
      break;
    }

    spanEndDist = i;
  }

  let spanSize = spanStartDist + spanEndDist;

  // Too small span - return original
  if (spanSize < 3) {
    return vec4f(applyBrightnessContrast(currentColor, uniforms.brightness, uniforms.contrast), 1.0);
  }

  // ============================================
  // Collect pixels in span and sort
  // ============================================
  var colors: array<vec3f, SAMPLE_COUNT>;
  var sortValues: array<f32, SAMPLE_COUNT>;

  let actualSamples = min(u32(spanSize), SAMPLE_COUNT);

  // Sample pixels across the span
  for (var i = 0u; i < actualSamples; i = i + 1u) {
    let t = f32(i) / f32(actualSamples - 1u);
    let sampleOffset = f32(-spanStartDist) + t * f32(spanSize);
    let sampleUV = texCoord + dirNorm * sampleOffset;
    let clampedUV = clamp(sampleUV, vec2f(0.001), vec2f(0.999));

    let color = textureSampleLevel(inputTexture, texSampler, clampedUV, 0.0).rgb;
    colors[i] = color;
    sortValues[i] = getSortValue(color);
  }

  // Fill remaining slots if span is smaller than SAMPLE_COUNT
  for (var i = actualSamples; i < SAMPLE_COUNT; i = i + 1u) {
    colors[i] = currentColor;
    sortValues[i] = getSortValue(currentColor);
  }

  // ============================================
  // Bubble sort (Kim Asendorf uses Java's built-in sort,
  // but bubble sort works for small arrays on GPU)
  // ============================================
  for (var sortPass = 0u; sortPass < actualSamples - 1u; sortPass = sortPass + 1u) {
    for (var i = 0u; i < actualSamples - 1u - sortPass; i = i + 1u) {
      var shouldSwap: bool;
      if (uniforms.reverse > 0.5) {
        shouldSwap = sortValues[i] < sortValues[i + 1u];
      } else {
        shouldSwap = sortValues[i] > sortValues[i + 1u];
      }

      if (shouldSwap) {
        let tempColor = colors[i];
        colors[i] = colors[i + 1u];
        colors[i + 1u] = tempColor;

        let tempVal = sortValues[i];
        sortValues[i] = sortValues[i + 1u];
        sortValues[i + 1u] = tempVal;
      }
    }
  }

  // ============================================
  // Find where current pixel maps in sorted array
  // ============================================
  let posInSpan = f32(spanStartDist) / f32(spanSize);
  let sortedIdx = posInSpan * f32(actualSamples - 1u);
  let idxLow = u32(floor(sortedIdx));
  let idxHigh = min(idxLow + 1u, actualSamples - 1u);
  let frac = fract(sortedIdx);

  // Interpolate for smoother result
  let sortedColor = mix(colors[idxLow], colors[idxHigh], frac);

  // Blend with original based on intensity
  let finalColor = mix(currentColor, sortedColor, uniforms.intensity);

  return vec4f(applyBrightnessContrast(finalColor, uniforms.brightness, uniforms.contrast), 1.0);
}
