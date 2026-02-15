
  BS = `
${ta}

struct BlockifyUniforms {
  resolution: vec2f,       // offset 0
  blockSize: f32,          // offset 8: 4 - 32 pixels
  style: f32,              // offset 12: 0 = full, 1 = shaded, 2 = outline
  borderWidth: f32,        // offset 16: 1 - 4 for outline mode
  brightness: f32,         // offset 20
  contrast: f32,           // offset 24
  borderColorR: f32,       // offset 28
  borderColorG: f32,       // offset 32
  borderColorB: f32,       // offset 36
  colorMode: f32,          // offset 40: 0 = average, 1 = grayscale
  _pad: vec3f,             // padding
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: BlockifyUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelPos = texCoord * uniforms.resolution;
  let blockPos = floor(pixelPos / uniforms.blockSize);
  let blockCenter = (blockPos + 0.5) * uniforms.blockSize;
  let blockUV = blockCenter / uniforms.resolution;

  var color = textureSample(inputTexture, texSampler, blockUV).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  // Apply grayscale if needed
  if (uniforms.colorMode > 0.5) {
    let gray = luminance(color);
    color = vec3f(gray);
  }

  let styleInt = i32(uniforms.style + 0.5);

  if (styleInt == 0) {
    // Full blocks - just return the color
    return vec4f(color, 1.0);
  } else if (styleInt == 1) {
    // Shaded - add slight gradient within block
    let localPos = (pixelPos - blockPos * uniforms.blockSize) / uniforms.blockSize;
    let shade = 0.9 + 0.1 * (1.0 - length(localPos - 0.5) * 1.4);
    return vec4f(color * shade, 1.0);
  } else {
    // Outline - draw border around blocks
    let localPos = pixelPos - blockPos * uniforms.blockSize;
    let borderWidth = uniforms.borderWidth;
    let isEdge = localPos.x < borderWidth || localPos.x > uniforms.blockSize - borderWidth ||
                 localPos.y < borderWidth || localPos.y > uniforms.blockSize - borderWidth;
    if (isEdge) {
      let borderColor = vec3f(uniforms.borderColorR, uniforms.borderColorG, uniforms.borderColorB);
      return vec4f(borderColor, 1.0);
    }
    return vec4f(color, 1.0);
  }
}
