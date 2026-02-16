
  PS = `
${ta}

struct ContourUniforms {
  resolution: vec2f,       // offset 0
  levels: f32,             // offset 8: 3 - 20, number of contour levels
  lineThickness: f32,      // offset 12: 0.5 - 3.0
  fillMode: f32,           // offset 16: 0 = filled bands, 1 = lines only
  brightness: f32,         // offset 20
  contrast: f32,           // offset 24
  lineColorR: f32,         // offset 28
  lineColorG: f32,         // offset 32
  lineColorB: f32,         // offset 36
  bgColorR: f32,           // offset 40
  bgColorG: f32,           // offset 44
  bgColorB: f32,           // offset 48
  colorMode: f32,          // offset 52: 0 = grayscale fills, 1 = original color fills, 2 = custom
  invert: f32,             // offset 56
  _pad: vec3f,             // padding
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ContourUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn sampleBrightness(uv: vec2f) -> f32 {
  let color = textureSample(inputTexture, texSampler, uv).rgb;
  let adjusted = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);
  return luminance(adjusted);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  var brightness = luminance(color);

  if (uniforms.invert > 0.5) {
    brightness = 1.0 - brightness;
  }

  // Quantize brightness to levels
  let quantized = floor(brightness * uniforms.levels) / uniforms.levels;
  let quantizedBrightness = quantized + 0.5 / uniforms.levels;

  // Sample neighbors to detect level boundaries
  let pixelSize = uniforms.lineThickness / uniforms.resolution;

  let left = sampleBrightness(texCoord + vec2f(-pixelSize.x, 0.0));
  let right = sampleBrightness(texCoord + vec2f(pixelSize.x, 0.0));
  let top = sampleBrightness(texCoord + vec2f(0.0, -pixelSize.y));
  let bottom = sampleBrightness(texCoord + vec2f(0.0, pixelSize.y));

  if (uniforms.invert > 0.5) {
    // Already inverted center, need to invert neighbors too for comparison
  }

  let leftQ = floor(left * uniforms.levels);
  let rightQ = floor(right * uniforms.levels);
  let topQ = floor(top * uniforms.levels);
  let bottomQ = floor(bottom * uniforms.levels);
  let centerQ = floor(brightness * uniforms.levels);

  // Draw line if we're at a level boundary
  let isContour = (leftQ != centerQ) || (rightQ != centerQ) || (topQ != centerQ) || (bottomQ != centerQ);

  let lineColor = vec3f(uniforms.lineColorR, uniforms.lineColorG, uniforms.lineColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  if (isContour) {
    return vec4f(lineColor, 1.0);
  }

  // Fill mode
  let fillModeInt = i32(uniforms.fillMode + 0.5);
  if (fillModeInt == 1) {
    // Lines only mode - show background where not a contour
    return vec4f(bgColor, 1.0);
  }

  // Filled bands mode
  let colorModeInt = i32(uniforms.colorMode + 0.5);
  if (colorModeInt == 1) {
    // Original colors, quantized
    let quantizedColor = floor(color * uniforms.levels) / uniforms.levels + 0.5 / uniforms.levels;
    return vec4f(quantizedColor, 1.0);
  } else if (colorModeInt == 2) {
    // Custom - blend between bg and line color based on brightness
    let blendColor = mix(bgColor, lineColor, quantizedBrightness);
    return vec4f(blendColor, 1.0);
  } else {
    // Grayscale fills (default)
    return vec4f(vec3f(quantizedBrightness), 1.0);
  }
}
