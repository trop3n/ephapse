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

struct BlockifyUniforms {
  resolution: vec2f,
  blockSize: f32,
  style: f32,
  borderWidth: f32,
  brightness: f32,
  contrast: f32,
  borderColorR: f32,
  borderColorG: f32,
  borderColorB: f32,
  colorMode: f32,
  _pad: f32,
  _pad2: f32,
  _pad3: f32,
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

  if (uniforms.colorMode > 0.5) {
    let gray = luminance(color);
    color = vec3f(gray);
  }

  let styleInt = i32(uniforms.style + 0.5);

  if (styleInt == 0) {
    return vec4f(color, 1.0);
  } else if (styleInt == 1) {
    let localPos = (pixelPos - blockPos * uniforms.blockSize) / uniforms.blockSize;
    let shade = 0.9 + 0.1 * (1.0 - length(localPos - 0.5) * 1.4);
    return vec4f(color * shade, 1.0);
  } else {
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
