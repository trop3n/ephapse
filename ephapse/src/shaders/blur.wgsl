struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct BlurUniforms {
  direction: vec2f,    // (1,0) for horizontal, (0,1) for vertical
  resolution: vec2f,
  radius: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: BlurUniforms;

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

// Gaussian weight function
fn gaussian(x: f32, sigma: f32) -> f32 {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  // Pixel size in UV space (0-1)
  let pixelSize = 1.0 / uniforms.resolution;

  // Direction scaled by pixel size - this gives us one pixel step
  let pixelStep = uniforms.direction * pixelSize;

  // Sigma for gaussian - radius is in pixels
  let sigma = max(uniforms.radius * 0.5, 1.0);

  var color = vec4f(0.0);
  var totalWeight = 0.0;

  // 13-tap Gaussian blur for quality
  // Sample from -6 to +6 pixel offsets, scaled by radius
  for (var i = -6; i <= 6; i++) {
    // Offset in pixels, spread across the radius
    let pixelOffset = f32(i) * (uniforms.radius / 6.0);

    // Gaussian weight based on distance
    let weight = gaussian(f32(i), sigma / (uniforms.radius / 6.0));

    // Sample position in UV space
    let sampleUV = texCoord + pixelStep * pixelOffset;

    // Clamp to valid UV range
    let clampedUV = clamp(sampleUV, vec2f(0.0), vec2f(1.0));

    color += textureSample(inputTexture, texSampler, clampedUV) * weight;
    totalWeight += weight;
  }

  return color / totalWeight;
}
