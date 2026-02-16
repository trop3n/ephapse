
  VS = `
${ta}

struct MatrixRainUniforms {
  resolution: vec2f,       // offset 0
  cellSize: f32,           // offset 8: base cell size in pixels (4-32)
  speed: f32,              // offset 12: 0.5 - 3.0
  trailLength: f32,        // offset 16: 5 - 30
  time: f32,               // offset 20
  rainColorR: f32,         // offset 24
  rainColorG: f32,         // offset 28
  rainColorB: f32,         // offset 32
  bgOpacity: f32,          // offset 36: 0 - 1, how much original shows through
  glowIntensity: f32,      // offset 40: 0 - 2
  direction: f32,          // offset 44: 0 = down, 1 = up, 2 = left, 3 = right
  brightness: f32,         // offset 48
  contrast: f32,           // offset 52
  threshold: f32,          // offset 56: black point threshold (0-1)
  spacing: f32,            // offset 60: gap between characters (0-1)
  // Font atlas metadata
  atlasSize: vec2f,        // offset 64: total atlas dimensions
  atlasCharSize: vec2f,    // offset 72: size of each character in atlas
  atlasCols: f32,          // offset 80: number of columns in atlas
  charsetLength: f32,      // offset 84: number of characters
  _pad: vec2f,             // offset 88: padding to 96 bytes
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: MatrixRainUniforms;
@group(0) @binding(3) var fontAtlas: texture_2d<f32>;

// Hash functions for randomness
fn hash11(p: f32) -> f32 {
  var p2 = fract(p * 0.1031);
  p2 *= p2 + 33.33;
  p2 *= p2 + p2;
  return fract(p2);
}

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

// Sample character from font atlas
fn sampleFontAtlas(cellUV: vec2f, charIndex: u32, spacing: f32) -> f32 {
  // Add margin around the character
  let margin = 0.05 + spacing * 0.15;

  // Check if we're in the margin area (will mask result later)
  let inMargin = cellUV.x < margin || cellUV.x > 1.0 - margin ||
                 cellUV.y < margin || cellUV.y > 1.0 - margin;

  // Normalize to inner area (clamp to avoid sampling outside)
  let innerUV = clamp((cellUV - margin) / (1.0 - 2.0 * margin), vec2f(0.0), vec2f(1.0));

  // Calculate position in atlas
  let atlasColsU = u32(uniforms.atlasCols);
  let atlasCol = f32(charIndex % atlasColsU);
  let atlasRow = f32(charIndex / atlasColsU);

  // Calculate UV in atlas (0-1 range)
  let charUVWidth = uniforms.atlasCharSize.x / uniforms.atlasSize.x;
  let charUVHeight = uniforms.atlasCharSize.y / uniforms.atlasSize.y;

  let atlasUV = vec2f(
    (atlasCol + innerUV.x) * charUVWidth,
    (atlasRow + innerUV.y) * charUVHeight
  );

  // Sample the font atlas (must be outside conditional for uniform control flow)
  let atlasColor = textureSample(fontAtlas, texSampler, atlasUV);

  // Return 0 if in margin, otherwise return sampled value
  return select(atlasColor.r, 0.0, inMargin);
}

// Calculate rain intensity for a column at a given position
fn getRainIntensity(columnIndex: f32, rowPos: f32, time: f32, speed: f32, trailLen: f32, direction: f32) -> vec2f {
  // Multiple drops per column
  let numDrops = 3;
  var maxIntensity = 0.0;
  var isHead = 0.0;

  for (var i = 0; i < numDrops; i++) {
    let dropSeed = columnIndex * 73.156 + f32(i) * 31.71;
    let dropSpeed = 0.5 + hash11(dropSeed) * 0.5;
    let dropPhase = hash11(dropSeed + 17.3);
    let dropLength = trailLen * (0.7 + hash11(dropSeed + 41.7) * 0.6);

    // Drop head position (wraps 0-1)
    let headPos = fract(time * speed * dropSpeed * 0.15 + dropPhase);

    // Distance from head depends on direction
    var distFromHead: f32;
    if (direction < 0.5 || direction > 2.5) {
      // Down or Right: head at headPos, trail behind
      distFromHead = headPos - rowPos;
      if (distFromHead < 0.0) {
        distFromHead += 1.0;
      }
    } else {
      // Up or Left: head at (1-headPos), trail behind
      let invertedHead = 1.0 - headPos;
      distFromHead = rowPos - invertedHead;
      if (distFromHead < 0.0) {
        distFromHead += 1.0;
      }
    }

    // Trail fades out behind head
    if (distFromHead < dropLength) {
      let trailIntensity = 1.0 - (distFromHead / dropLength);
      maxIntensity = max(maxIntensity, trailIntensity * trailIntensity);

      // Check if this is the head
      if (distFromHead < 0.02) {
        isHead = 1.0;
      }
    }
  }

  return vec2f(maxIntensity, isHead);
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  // Sample the source image
  var srcColor = textureSample(inputTexture, texSampler, texCoord).rgb;
  srcColor = applyBrightnessContrast(srcColor, uniforms.brightness, uniforms.contrast);
  let srcBrightness = luminance(srcColor);

  let rainColor = vec3f(uniforms.rainColorR, uniforms.rainColorG, uniforms.rainColorB);
  let direction = uniforms.direction;

  // Cell/character size - use cellSize directly, with spacing gap
  let baseCellSize = max(uniforms.cellSize, 4.0);
  let spacingGap = baseCellSize * uniforms.spacing;
  let totalCellSize = baseCellSize + spacingGap;
  let cellsX = uniforms.resolution.x / totalCellSize;
  let cellsY = uniforms.resolution.y / totalCellSize;

  // Which cell are we in?
  let cellX = floor(texCoord.x * cellsX);
  let cellY = floor(texCoord.y * cellsY);

  // Position within cell (0-1)
  // For horizontal directions, rotate the cell UV 90 degrees
  var cellUV: vec2f;
  if (direction > 1.5) {
    // Left (2) or Right (3): horizontal flow - rotate characters
    cellUV = vec2f(
      fract(texCoord.y * cellsY),
      fract(texCoord.x * cellsX)
    );
  } else {
    // Down (0) or Up (1): vertical flow
    cellUV = vec2f(
      fract(texCoord.x * cellsX),
      fract(texCoord.y * cellsY)
    );
  }

  // Column and row position for rain calculation
  var columnIndex: f32;
  var rowPos: f32;
  if (direction > 1.5) {
    // Left (2) or Right (3): horizontal flow
    columnIndex = cellY;
    rowPos = texCoord.x;
  } else {
    // Down (0) or Up (1): vertical flow
    columnIndex = cellX;
    rowPos = texCoord.y;
  }

  // Normalized trail length
  let trailLen = uniforms.trailLength / 50.0;

  // Get rain intensity and head status
  let rainData = getRainIntensity(columnIndex, rowPos, uniforms.time, uniforms.speed, trailLen, direction);
  let rainIntensity = rainData.x;
  let isHead = rainData.y;

  // Sample the source at cell center for character brightness
  let cellCenterUV = (vec2f(cellX, cellY) + 0.5) / vec2f(cellsX, cellsY);
  let cellColor = textureSample(inputTexture, texSampler, cellCenterUV).rgb;
  let cellBrightness = luminance(cellColor);

  // Character selection: animate through characters based on time and position
  let charSeed = hash21(vec2f(cellX, cellY));
  let charAnimIndex = floor(charSeed * 50.0 + uniforms.time * 2.0);
  let charsetLen = max(uniforms.charsetLength, 1.0);
  let charIndex = u32(floor(hash11(charAnimIndex) * charsetLen)) % u32(charsetLen);

  // Get character pattern from font atlas
  let charPattern = sampleFontAtlas(cellUV, charIndex, uniforms.spacing);

  // Calculate local edge strength for more interest in detailed areas
  let edgeSampleOffset = 1.0 / max(cellsX, cellsY);
  let leftBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(-edgeSampleOffset, 0.0)).rgb);
  let rightBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(edgeSampleOffset, 0.0)).rgb);
  let topBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(0.0, -edgeSampleOffset)).rgb);
  let bottomBright = luminance(textureSample(inputTexture, texSampler, texCoord + vec2f(0.0, edgeSampleOffset)).rgb);
  let edgeStrength = abs(leftBright - rightBright) + abs(topBright - bottomBright);

  // Source influence: characters are more active/visible where source is brighter or has edges
  let sourceInfluence = cellBrightness * 0.7 + edgeStrength * 0.5;

  // Apply threshold - pixels darker than threshold show no characters
  let thresholdCutoff = uniforms.threshold;
  let aboveThreshold = step(thresholdCutoff, cellBrightness);
  let thresholdedInfluence = sourceInfluence * aboveThreshold;

  // Combine rain intensity with source influence
  let effectiveRain = rainIntensity * aboveThreshold + thresholdedInfluence * 0.4 * (1.0 - rainIntensity);

  // Character visibility - brighter areas and edges show more (only above threshold)
  let charVisibility = charPattern * (0.15 + thresholdedInfluence * 0.85) * aboveThreshold;

  // Background: dark with hint of source
  let bgColor = srcColor * uniforms.bgOpacity * 0.1;

  // Rain color modulated by intensity and character pattern
  let tintedRain = mix(rainColor, rainColor * (0.5 + cellBrightness * 0.5), 0.3);
  var charColor = tintedRain * effectiveRain * charVisibility;

  // Head glow - bright white/green at the leading edge
  if (isHead > 0.5 && charPattern > 0.5) {
    let headBrightness = 0.7 + edgeStrength * 0.5;
    let headColor = mix(rainColor, vec3f(1.0, 1.0, 1.0), headBrightness);
    charColor = max(charColor, headColor * charVisibility * uniforms.glowIntensity);
  }

  // Static characters in bright/edge areas even without rain (reveals the image)
  let staticIntensity = 0.2 * thresholdedInfluence * (1.0 - rainIntensity * 0.5) * aboveThreshold;
  let staticChars = rainColor * staticIntensity * charVisibility;

  // Final composition
  let result = bgColor + charColor + staticChars;

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
