
  qS = `
${ta}

struct VhsUniforms {
  resolution: vec2f,
  time: f32,             // offset 8
  distortion: f32,       // offset 12: tape warp amount (0-1)
  noise: f32,            // offset 16: static noise amount (0-1)
  colorBleed: f32,       // offset 20: RGB separation (0-1)
  scanlines: f32,        // offset 24: scanline intensity (0-1)
  trackingError: f32,    // offset 28: horizontal displacement (0-1)
  brightness: f32,       // offset 32
  contrast: f32,         // offset 36
  _pad: vec3f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: VhsUniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var uv = texCoord;
  let time = uniforms.time;

  // === TRACKING ERROR - Horizontal displacement that jumps ===
  if (uniforms.trackingError > 0.01) {
    let trackNoise = noise(vec2f(floor(uv.y * 20.0), floor(time * 2.0)));
    let trackOffset = (trackNoise - 0.5) * 0.1 * uniforms.trackingError;

    // Occasional big jumps
    let jumpNoise = noise(vec2f(time * 0.5, 0.0));
    let bigJump = step(0.92, jumpNoise) * (noise(vec2f(uv.y * 5.0, time)) - 0.5) * 0.3;

    uv.x = uv.x + trackOffset + bigJump * uniforms.trackingError;
  }

  // === TAPE WARP - Wavy distortion ===
  if (uniforms.distortion > 0.01) {
    let warpFreq = 3.0 + noise(vec2f(time * 0.1, 0.0)) * 5.0;
    let warpAmp = uniforms.distortion * 0.02;

    // Vertical wobble
    uv.x = uv.x + sin(uv.y * warpFreq * 6.28 + time * 2.0) * warpAmp;

    // Horizontal shake
    let shake = noise(vec2f(time * 10.0, 0.0)) - 0.5;
    uv.x = uv.x + shake * uniforms.distortion * 0.01;

    // Edge distortion (worse at top/bottom)
    let edgeDist = abs(uv.y - 0.5) * 2.0;
    let edgeWarp = pow(edgeDist, 3.0) * uniforms.distortion * 0.1;
    uv.x = uv.x + sin(time * 3.0 + uv.y * 10.0) * edgeWarp;
  }

  // Clamp UV
  uv = clamp(uv, vec2f(0.0), vec2f(1.0));

  // === COLOR BLEED / CHROMA SMEAR ===
  var color: vec3f;
  if (uniforms.colorBleed > 0.01) {
    let bleedAmount = uniforms.colorBleed * 0.01;

    // Sample R, G, B at slightly different positions (horizontal smear)
    let r = textureSampleLevel(inputTexture, texSampler, uv + vec2f(bleedAmount * 2.0, 0.0), 0.0).r;
    let g = textureSampleLevel(inputTexture, texSampler, uv, 0.0).g;
    let b = textureSampleLevel(inputTexture, texSampler, uv - vec2f(bleedAmount * 2.0, 0.0), 0.0).b;

    // Additional blur on chroma
    var chromaBlur = vec3f(0.0);
    for (var i = -2; i <= 2; i = i + 1) {
      let offset = f32(i) * bleedAmount;
      chromaBlur = chromaBlur + textureSampleLevel(inputTexture, texSampler, uv + vec2f(offset, 0.0), 0.0).rgb;
    }
    chromaBlur = chromaBlur / 5.0;

    color = vec3f(r, g, b);
    color = mix(color, chromaBlur, 0.3);
  } else {
    color = textureSampleLevel(inputTexture, texSampler, uv, 0.0).rgb;
  }

  // === SCANLINES ===
  if (uniforms.scanlines > 0.01) {
    let scanline = sin(uv.y * uniforms.resolution.y * 3.14159) * 0.5 + 0.5;
    let scanlineIntensity = mix(1.0, scanline, uniforms.scanlines * 0.5);
    color = color * scanlineIntensity;

    // Subtle scanline color variation
    let scanlinePhase = floor(uv.y * uniforms.resolution.y);
    color.r = color.r * (1.0 - uniforms.scanlines * 0.1 * step(0.5, fract(scanlinePhase * 0.5)));
  }

  // === STATIC NOISE ===
  if (uniforms.noise > 0.01) {
    // Fine grain noise
    let grain = hash(uv * uniforms.resolution + vec2f(time * 1000.0)) - 0.5;
    color = color + vec3f(grain * uniforms.noise * 0.3);

    // Occasional noise bands
    let bandNoise = noise(vec2f(uv.y * 100.0, time * 5.0));
    let band = step(0.97, bandNoise) * (hash(vec2f(uv.x * 100.0, time)) - 0.5);
    color = color + vec3f(band * uniforms.noise);

    // Rolling static bars
    let barY = fract(time * 0.3);
    let barDist = abs(uv.y - barY);
    let inBar = step(barDist, 0.02);
    let barNoise = hash(vec2f(uv.x * 500.0, floor(time * 60.0))) - 0.5;
    color = color + vec3f(barNoise * inBar * uniforms.noise * 0.5);
  }

  // === VHS COLOR CHARACTERISTICS ===
  // Slight color degradation
  color = mix(color, vec3f(dot(color, vec3f(0.299, 0.587, 0.114))), 0.1);

  // Boost certain colors typical of VHS
  color.r = color.r * 1.1;
  color.b = color.b * 0.9;

  // Slight vignette
  let vignette = 1.0 - length((uv - 0.5) * vec2f(0.5, 0.7)) * 0.5;
  color = color * vignette;

  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
