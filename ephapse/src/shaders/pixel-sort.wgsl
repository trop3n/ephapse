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

struct PixelSortUniforms {
  resolution: vec2f,
  threshold: f32,
  direction: f32,
  mode: f32,
  streakLength: f32,
  intensity: f32,
  randomness: f32,
  reverse: f32,
  brightness: f32,
  contrast: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: PixelSortUniforms;

const SAMPLE_COUNT: u32 = 24u;

fn hash11(p: f32) -> f32 {
  var p2 = fract(p * 0.1031);
  p2 = p2 * (p2 + 33.33);
  return fract(p2 * (p2 + p2));
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn brightness(c: vec3f) -> f32 {
  return max(max(c.r, c.g), c.b);
}

fn applyBrightnessContrast(color: vec3f, brt: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brt);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn isSpanStart(color: vec3f, threshold: f32, mode: f32) -> bool {
  let modeInt = i32(mode + 0.5);

  if (modeInt == 0) {
    let blackThreshold = threshold * 0.25;
    return luminance(color) > blackThreshold;
  } else if (modeInt == 1) {
    let whiteThreshold = 1.0 - threshold * 0.25;
    return luminance(color) < whiteThreshold;
  } else if (modeInt == 2) {
    return brightness(color) > threshold;
  } else {
    return brightness(color) < threshold;
  }
}

fn isSpanEnd(color: vec3f, threshold: f32, mode: f32) -> bool {
  let modeInt = i32(mode + 0.5);

  if (modeInt == 0) {
    let blackThreshold = threshold * 0.25;
    return luminance(color) <= blackThreshold;
  } else if (modeInt == 1) {
    let whiteThreshold = 1.0 - threshold * 0.25;
    return luminance(color) >= whiteThreshold;
  } else if (modeInt == 2) {
    return brightness(color) <= threshold;
  } else {
    return brightness(color) >= threshold;
  }
}

fn getSortValue(color: vec3f) -> f32 {
  return luminance(color);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;
  let pixel = texCoord * uniforms.resolution;

  var dir: vec2f;
  var lineCoord: f32;

  if (uniforms.direction > 1.5) {
    dir = normalize(vec2f(1.0, 1.0));
    lineCoord = floor(pixel.x - pixel.y);
  } else if (uniforms.direction > 0.5) {
    dir = vec2f(0.0, 1.0);
    lineCoord = floor(pixel.x);
  } else {
    dir = vec2f(1.0, 0.0);
    lineCoord = floor(pixel.y);
  }

  let lineRand = hash11(lineCoord * 0.173);
  let thresholdVar = uniforms.threshold * (1.0 + (lineRand - 0.5) * uniforms.randomness * 0.5);

  let currentColor = textureSampleLevel(inputTexture, texSampler, texCoord, 0.0).rgb;

  if (!isSpanStart(currentColor, thresholdVar, uniforms.mode)) {
    return vec4f(applyBrightnessContrast(currentColor, uniforms.brightness * 0.005, uniforms.contrast * 0.01), 1.0);
  }

  let dirNorm = dir * pixelSize;
  let maxSteps = i32(uniforms.streakLength);

  var spanStartDist: i32 = 0;
  for (var i = 1; i <= maxSteps; i = i + 1) {
    let checkUV = texCoord - dirNorm * f32(i);

    if (checkUV.x < 0.0 || checkUV.x > 1.0 || checkUV.y < 0.0 || checkUV.y > 1.0) {
      spanStartDist = i;
      break;
    }

    let checkColor = textureSampleLevel(inputTexture, texSampler, checkUV, 0.0).rgb;

    if (!isSpanStart(checkColor, thresholdVar, uniforms.mode)) {
      spanStartDist = i;
      break;
    }

    if (isSpanEnd(checkColor, thresholdVar, uniforms.mode)) {
      spanStartDist = i;
      break;
    }

    spanStartDist = i;
  }

  var spanEndDist: i32 = 0;
  for (var i = 1; i <= maxSteps; i = i + 1) {
    let checkUV = texCoord + dirNorm * f32(i);

    if (checkUV.x < 0.0 || checkUV.x > 1.0 || checkUV.y < 0.0 || checkUV.y > 1.0) {
      spanEndDist = i;
      break;
    }

    let checkColor = textureSampleLevel(inputTexture, texSampler, checkUV, 0.0).rgb;

    if (isSpanEnd(checkColor, thresholdVar, uniforms.mode) || !isSpanStart(checkColor, thresholdVar, uniforms.mode)) {
      spanEndDist = i;
      break;
    }

    spanEndDist = i;
  }

  let spanSize = spanStartDist + spanEndDist;

  if (spanSize < 3) {
    return vec4f(applyBrightnessContrast(currentColor, uniforms.brightness * 0.005, uniforms.contrast * 0.01), 1.0);
  }

  var colors: array<vec3f, SAMPLE_COUNT>;
  var sortValues: array<f32, SAMPLE_COUNT>;

  let actualSamples = min(u32(spanSize), SAMPLE_COUNT);

  for (var i = 0u; i < actualSamples; i = i + 1u) {
    let t = f32(i) / f32(actualSamples - 1u);
    let sampleOffset = f32(-spanStartDist) + t * f32(spanSize);
    let sampleUV = texCoord + dirNorm * sampleOffset;
    let clampedUV = clamp(sampleUV, vec2f(0.001), vec2f(0.999));

    let color = textureSampleLevel(inputTexture, texSampler, clampedUV, 0.0).rgb;
    colors[i] = color;
    sortValues[i] = getSortValue(color);
  }

  for (var i = actualSamples; i < SAMPLE_COUNT; i = i + 1u) {
    colors[i] = currentColor;
    sortValues[i] = getSortValue(currentColor);
  }

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

  let posInSpan = f32(spanStartDist) / f32(spanSize);
  let sortedIdx = posInSpan * f32(actualSamples - 1u);
  let idxLow = u32(floor(sortedIdx));
  let idxHigh = min(idxLow + 1u, actualSamples - 1u);
  let frac = fract(sortedIdx);

  let sortedColor = mix(colors[idxLow], colors[idxHigh], frac);

  let finalColor = mix(currentColor, sortedColor, uniforms.intensity);

  return vec4f(applyBrightnessContrast(finalColor, uniforms.brightness * 0.005, uniforms.contrast * 0.01), 1.0);
}
