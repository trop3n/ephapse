struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

struct PostProcessUniforms {
  resolution: vec2f,        // offset 0
  time: f32,                // offset 8
  bloomEnabled: u32,        // offset 12
  bloomIntensity: f32,      // offset 16
  _bloomPad: f32,           // offset 20 (was glowRadius, now unused in shader)
  grainEnabled: u32,        // offset 24
  grainIntensity: f32,      // offset 28
  grainSize: f32,           // offset 32
  grainSpeed: f32,          // offset 36
  chromaticEnabled: u32,    // offset 40
  chromaticOffset: f32,     // offset 44
  scanlinesEnabled: u32,    // offset 48
  scanlinesOpacity: f32,    // offset 52
  scanlinesSpacing: f32,    // offset 56
  vignetteEnabled: u32,     // offset 60
  vignetteIntensity: f32,   // offset 64
  vignetteRadius: f32,      // offset 68
  crtEnabled: u32,          // offset 72
  crtAmount: f32,           // offset 76
  phosphorEnabled: u32,     // offset 80
  _padding1: f32,           // offset 84
  phosphorColorR: f32,      // offset 88
  phosphorColorG: f32,      // offset 92
  phosphorColorB: f32,      // offset 96
  _padding2: f32,           // offset 100
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: PostProcessUniforms;
@group(0) @binding(3) var bloomTexture: texture_2d<f32>;

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

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

// CRT barrel distortion
fn crtDistort(uv: vec2f, amount: f32) -> vec2f {
  let centered = uv - 0.5;
  let dist = dot(centered, centered);
  let distorted = centered * (1.0 + dist * amount);
  return distorted + 0.5;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;

  // Apply CRT barrel distortion first (affects UV coordinates)
  // Use select() to avoid non-uniform control flow before textureSample
  let crtActive = uniforms.crtEnabled == 1u && uniforms.crtAmount > 0.0;
  let distortedUV = crtDistort(texCoord, uniforms.crtAmount);
  let uv = select(texCoord, distortedUV, crtActive);

  // Check if UV is out of bounds (for CRT corners)
  let outOfBounds = crtActive && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0);

  var color = textureSample(inputTexture, texSampler, clamp(uv, vec2f(0.0), vec2f(1.0)));

  // Chromatic aberration
  let chromaticOffset = uniforms.chromaticOffset * pixelSize.x * f32(uniforms.chromaticEnabled);
  let rShift = textureSample(inputTexture, texSampler, vec2f(uv.x - chromaticOffset, uv.y)).r;
  let bShift = textureSample(inputTexture, texSampler, vec2f(uv.x + chromaticOffset, uv.y)).b;
  color.r = select(color.r, rShift, uniforms.chromaticEnabled == 1u && uniforms.chromaticOffset > 0.0);
  color.b = select(color.b, bShift, uniforms.chromaticEnabled == 1u && uniforms.chromaticOffset > 0.0);

  // Bloom effect (multi-pass bloom blended from separate texture)
  if (uniforms.bloomEnabled == 1u) {
    let bloom = textureSample(bloomTexture, texSampler, uv);
    color = vec4f(color.rgb + bloom.rgb * uniforms.bloomIntensity, color.a);
  }

  // Scanlines
  let fragY = uv.y * uniforms.resolution.y;
  let scanline = fragY % (uniforms.scanlinesSpacing * 2.0);
  let scanlineActive = f32(uniforms.scanlinesEnabled == 1u && scanline < uniforms.scanlinesSpacing);
  color = vec4f(color.rgb * (1.0 - uniforms.scanlinesOpacity * scanlineActive), color.a);

  // Film grain
  let grainUV = floor(uv * uniforms.resolution / max(uniforms.grainSize, 1.0)) * max(uniforms.grainSize, 1.0);
  let noise = hash(grainUV + uniforms.time * uniforms.grainSpeed) - 0.5;
  let grainAmount = noise * (uniforms.grainIntensity / 100.0) * f32(uniforms.grainEnabled);
  color = vec4f(color.rgb + grainAmount, color.a);

  // Phosphor color tint (terminal color effect)
  if (uniforms.phosphorEnabled == 1u) {
    let luminance = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
    let phosphorColor = vec3f(uniforms.phosphorColorR, uniforms.phosphorColorG, uniforms.phosphorColorB);
    color = vec4f(phosphorColor * luminance, color.a);
  }

  // Vignette (darken edges)
  if (uniforms.vignetteEnabled == 1u) {
    let centered = uv - 0.5;
    let dist = length(centered) * 2.0; // 0 at center, ~1.4 at corners
    let vignette = 1.0 - smoothstep(uniforms.vignetteRadius, 1.0, dist) * uniforms.vignetteIntensity;
    color = vec4f(color.rgb * vignette, color.a);
  }

  // Apply CRT out-of-bounds masking (black corners)
  let finalColor = select(color, vec4f(0.0, 0.0, 0.0, 1.0), outOfBounds);

  return clamp(finalColor, vec4f(0.0), vec4f(1.0));
}
