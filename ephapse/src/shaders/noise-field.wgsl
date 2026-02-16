
  HS = `
${ta}

struct NoiseFieldUniforms {
  resolution: vec2f,       // offset 0
  scale: f32,              // offset 8: 10 - 100
  intensity: f32,          // offset 12: 0.5 - 3.0
  speed: f32,              // offset 16: 0.1 - 3.0
  time: f32,               // offset 20
  octaves: f32,            // offset 24: 1 - 6
  animate: f32,            // offset 28: 0 or 1
  brightness: f32,         // offset 32
  contrast: f32,           // offset 36
  noiseType: f32,          // offset 40: 0 = perlin, 1 = simplex approx, 2 = worley
  distortOnly: f32,        // offset 44: 0 = distort + overlay, 1 = distort only
  _pad: vec2f,             // padding
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: NoiseFieldUniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn hash2(p: vec2f) -> vec2f {
  return vec2f(
    fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2f(269.5, 183.3))) * 43758.5453)
  );
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Simplex-like noise approximation
fn simplexNoise(p: vec2f) -> f32 {
  let K1 = 0.366025404; // (sqrt(3)-1)/2
  let K2 = 0.211324865; // (3-sqrt(3))/6

  let i = floor(p + (p.x + p.y) * K1);
  let a = p - i + (i.x + i.y) * K2;
  let o = step(a.yx, a.xy);
  let b = a - o + K2;
  let c = a - 1.0 + 2.0 * K2;

  let h = max(0.5 - vec3f(dot(a, a), dot(b, b), dot(c, c)), vec3f(0.0));
  let n = h * h * h * h * vec3f(dot(a, hash2(i) - 0.5), dot(b, hash2(i + o) - 0.5), dot(c, hash2(i + 1.0) - 0.5));

  return dot(n, vec3f(70.0));
}

// Worley (cellular) noise
fn worleyNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);

  var minDist = 1.0;
  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let neighbor = vec2f(f32(x), f32(y));
      let point = hash2(i + neighbor);
      let diff = neighbor + point - f;
      let dist = length(diff);
      minDist = min(minDist, dist);
    }
  }

  return minDist;
}

fn getNoise(p: vec2f, noiseType: f32) -> f32 {
  let typeInt = i32(noiseType + 0.5);
  if (typeInt == 1) {
    return simplexNoise(p) * 0.5 + 0.5;
  } else if (typeInt == 2) {
    return worleyNoise(p);
  } else {
    return noise(p);
  }
}

fn fbm(p: vec2f, octaves: i32, noiseType: f32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i = i + 1) {
    value = value + amplitude * getNoise(pos, noiseType);
    pos = pos * 2.0;
    amplitude = amplitude * 0.5;
  }

  return value;
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let noiseScale = uniforms.scale;

  var animatedTime = 0.0;
  if (uniforms.animate > 0.5) {
    animatedTime = uniforms.time * uniforms.speed;
  }

  let octaves = i32(uniforms.octaves + 0.5);

  // Generate noise-based displacement
  let noisePos = texCoord * noiseScale + vec2f(animatedTime * 0.1);
  let noiseVal = fbm(noisePos, octaves, uniforms.noiseType);
  let noiseVal2 = fbm(noisePos + vec2f(100.0, 100.0), octaves, uniforms.noiseType);

  // Displace UV coordinates
  let displacement = (vec2f(noiseVal, noiseVal2) - 0.5) * 2.0 * uniforms.intensity * 0.02;
  let displacedUV = texCoord + displacement;

  var color = textureSample(inputTexture, texSampler, clamp(displacedUV, vec2f(0.0), vec2f(1.0))).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  if (uniforms.distortOnly < 0.5) {
    // Add subtle noise overlay
    let overlayNoise = fbm(texCoord * noiseScale * 2.0 + animatedTime, octaves, uniforms.noiseType) * 0.1;
    color = color + vec3f(overlayNoise * uniforms.intensity * 0.3);
  }

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
