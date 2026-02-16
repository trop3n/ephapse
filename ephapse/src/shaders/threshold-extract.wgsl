struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct ThresholdUniforms {
  threshold: f32,
  softThreshold: f32,
  _padding: vec2f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ThresholdUniforms;

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

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let color = textureSample(inputTexture, texSampler, texCoord);

  // Calculate luminance
  let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));

  // Simple soft threshold: smoothstep from threshold to threshold + softThreshold
  let t = uniforms.threshold;
  let softRange = uniforms.softThreshold;

  // How much this pixel exceeds the threshold (0 = at threshold, 1 = way above)
  let brightness = smoothstep(t - softRange, t + softRange, luminance);

  // Output the original color scaled by how much it exceeds threshold
  // This preserves color while extracting only bright areas
  return vec4f(color.rgb * brightness, 1.0);
}
