
  YS = `
${ta}

struct VoronoiUniforms {
  resolution: vec2f,
  cellSize: f32,         // offset 8: size of cells (10-100)
  edgeWidth: f32,        // offset 12: border thickness (0-1)
  edgeColor: f32,        // offset 16: 0=black, 1=white, 2=original
  colorMode: f32,        // offset 20: 0=cell average, 1=center sample, 2=gradient
  randomize: f32,        // offset 24: cell point randomness (0-1)
  brightness: f32,       // offset 28
  contrast: f32,         // offset 32
  _pad: vec3f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: VoronoiUniforms;

fn hash2(p: vec2f) -> vec2f {
  let k = vec2f(0.3183099, 0.3678794);
  var pp = p * k + k.yx;
  return fract(16.0 * k * fract(pp.x * pp.y * (pp.x + pp.y))) * 2.0 - 1.0;
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

// Returns: xy = closest cell center, z = distance to closest, w = distance to second closest
fn voronoi(p: vec2f, randomness: f32) -> vec4f {
  let cellP = floor(p);
  let fractP = fract(p);

  var minDist = 8.0;
  var minDist2 = 8.0;
  var closestCell = vec2f(0.0);

  // Check 3x3 neighborhood
  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let neighbor = vec2f(f32(x), f32(y));
      let cellCenter = cellP + neighbor;

      // Random offset for cell point
      let randOffset = hash2(cellCenter) * randomness * 0.5;
      let point = neighbor + 0.5 + randOffset;

      let dist = length(point - fractP);

      if (dist < minDist) {
        minDist2 = minDist;
        minDist = dist;
        closestCell = cellCenter;
      } else if (dist < minDist2) {
        minDist2 = dist;
      }
    }
  }

  return vec4f(closestCell, minDist, minDist2);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixel = texCoord * uniforms.resolution;
  let cellScale = uniforms.cellSize;
  let scaledP = pixel / cellScale;

  let vor = voronoi(scaledP, uniforms.randomize);
  let closestCell = vor.xy;
  let minDist = vor.z;
  let minDist2 = vor.w;

  // Edge detection (distance to cell boundary)
  let edgeDist = minDist2 - minDist;
  let edge = smoothstep(0.0, uniforms.edgeWidth * 0.3, edgeDist);

  // Sample color based on mode
  var cellColor: vec3f;

  if (uniforms.colorMode < 0.5) {
    // Mode 0: Average color in cell region
    var avgColor = vec3f(0.0);
    var samples = 0.0;

    // Sample multiple points within the cell
    for (var dy = -2; dy <= 2; dy = dy + 1) {
      for (var dx = -2; dx <= 2; dx = dx + 1) {
        let sampleOffset = vec2f(f32(dx), f32(dy)) * 0.2;
        let sampleUV = (closestCell + 0.5 + sampleOffset) * cellScale / uniforms.resolution;
        let clampedUV = clamp(sampleUV, vec2f(0.0), vec2f(1.0));
        avgColor = avgColor + textureSampleLevel(inputTexture, texSampler, clampedUV, 0.0).rgb;
        samples = samples + 1.0;
      }
    }
    cellColor = avgColor / samples;
  } else if (uniforms.colorMode < 1.5) {
    // Mode 1: Sample at cell center
    let centerUV = (closestCell + 0.5) * cellScale / uniforms.resolution;
    let clampedUV = clamp(centerUV, vec2f(0.0), vec2f(1.0));
    cellColor = textureSampleLevel(inputTexture, texSampler, clampedUV, 0.0).rgb;
  } else {
    // Mode 2: Gradient based on distance within cell
    let centerUV = (closestCell + 0.5) * cellScale / uniforms.resolution;
    let currentColor = textureSampleLevel(inputTexture, texSampler, texCoord, 0.0).rgb;
    let centerColor = textureSampleLevel(inputTexture, texSampler, clamp(centerUV, vec2f(0.0), vec2f(1.0)), 0.0).rgb;

    // Blend from center color to edge color based on distance
    let gradientT = smoothstep(0.0, 0.7, minDist);
    cellColor = mix(centerColor, currentColor, gradientT * 0.5);
  }

  // Edge color
  var edgeCol: vec3f;
  if (uniforms.edgeColor < 0.5) {
    edgeCol = vec3f(0.0); // Black
  } else if (uniforms.edgeColor < 1.5) {
    edgeCol = vec3f(1.0); // White
  } else {
    // Original color (darkened)
    edgeCol = cellColor * 0.3;
  }

  // Combine cell and edge
  var finalColor = mix(edgeCol, cellColor, edge);

  finalColor = applyBrightnessContrast(finalColor, uniforms.brightness, uniforms.contrast);
  return vec4f(finalColor, 1.0);
}
