@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let cellX = id.x;
  let cellY = id.y;

  // Bounds check
  if (cellX >= uniforms.gridSize.x || cellY >= uniforms.gridSize.y) {
    return;
  }

  // Get sample count from uniforms (2, 3, or 4)
  let samplesPerAxis = uniforms.samplesPerAxis;
  let totalSamples = samplesPerAxis * samplesPerAxis;

  // OPTIMIZATION: Precompute reciprocals and invariants ONCE before loops
  let invTotalSamples = 1.0 / f32(totalSamples);
  let invSamplesPerAxis = 1.0 / f32(samplesPerAxis);
  let invGamma = 1.0 / uniforms.imageGamma;
  let contrastFactor = (uniforms.imageContrast + 100.0) * INV_100;
  let brightnessOffset = uniforms.imageBrightness * INV_200;
  let invSourceSize = 1.0 / uniforms.sourceSize;
  let doInvert = uniforms.invert > 0.5;

  // Calculate UV coordinates for this cell in the source image
  let cellUVStart = vec2f(f32(cellX), f32(cellY)) * uniforms.cellSize * invSourceSize;
  let cellUVSize = uniforms.cellSize * invSourceSize;

  // Sample source image at multiple points within the cell
  var sourceBrightness = 0.0;
  var sourceSamples: array<f32, 16>;  // Max 4x4 sample grid

  for (var sy = 0u; sy < samplesPerAxis; sy++) {
    for (var sx = 0u; sx < samplesPerAxis; sx++) {
      let sampleUV = cellUVStart + cellUVSize * vec2f(
        (f32(sx) + 0.5) * invSamplesPerAxis,
        (f32(sy) + 0.5) * invSamplesPerAxis
      );
      let color = textureSampleLevel(sourceTexture, sourceSampler, sampleUV, 0.0);

      // OPTIMIZATION: Inline luma calculation (avoid vec3f construction)
      var brightness = color.r * LUMA_R + color.g * LUMA_G + color.b * LUMA_B;

      // Apply image gamma (using precomputed inverse)
      brightness = pow(brightness, invGamma);

      // Apply image brightness adjustment (using precomputed offset)
      brightness = brightness + brightnessOffset;

      // Apply image contrast adjustment (using precomputed factor)
      brightness = (brightness - 0.5) * contrastFactor + 0.5;

      // Apply brightness mapping (gamma for character selection curve)
      brightness = pow(clamp(brightness, 0.0, 1.0), uniforms.brightnessMapping);

      // OPTIMIZATION: Branchless invert using select()
      brightness = select(brightness, 1.0 - brightness, doInvert);

      // Clamp final brightness
      brightness = clamp(brightness, 0.0, 1.0);

      sourceSamples[sy * samplesPerAxis + sx] = brightness;
      sourceBrightness += brightness;
    }
  }
  // OPTIMIZATION: Multiply by precomputed reciprocal instead of divide
  sourceBrightness *= invTotalSamples;

  // For pure brightness mapping (brightnessWeight = 1.0), map brightness directly to character index
  let indexBasedMatch = u32(clamp(sourceBrightness, 0.0, 0.9999) * f32(uniforms.charsetLength));

  // If brightnessWeight is 1.0, just use the index-based approach (original behavior)
  if (uniforms.brightnessWeight >= 0.99) {
    let cellIndex = cellY * uniforms.gridSize.x + cellX;
    matchResult[cellIndex] = indexBasedMatch;
    return;
  }

  // Compare against each character to find best match using spatial similarity
  var bestMatch = 0u;
  var bestScore = 999999.0;

  // OPTIMIZATION: Hoist texture dimensions and precompute outside character loop
  let atlasTexSize = vec2f(textureDimensions(fontAtlas));
  let invAtlasTexSize = 1.0 / atlasTexSize;
  let charsetLenF = f32(uniforms.charsetLength);
  let charsetLenMinus1F = f32(uniforms.charsetLength - 1u);
  let invCharsetLen = 1.0 / charsetLenF;
  let expectedIndex = sourceBrightness * charsetLenMinus1F;
  let spatialWeight = 1.0 - uniforms.brightnessWeight;

  for (var charIdx = 0u; charIdx < uniforms.charsetLength; charIdx++) {
    // Index-based distance (using precomputed values)
    let indexDist = abs(f32(charIdx) - expectedIndex) * invCharsetLen;

    // Spatial distance (how similar is the pattern)
    var spatialDistSq = 0.0;  // OPTIMIZATION: Keep squared, avoid sqrt
    let atlasCol = charIdx % uniforms.atlasCols;
    let atlasRow = charIdx / uniforms.atlasCols;
    let atlasCharStart = vec2f(f32(atlasCol), f32(atlasRow)) * uniforms.atlasCharSize;

    for (var sy = 0u; sy < samplesPerAxis; sy++) {
      for (var sx = 0u; sx < samplesPerAxis; sx++) {
        // Sample the character from the atlas at corresponding position
        let atlasUV = (atlasCharStart + uniforms.atlasCharSize * vec2f(
          (f32(sx) + 0.5) * invSamplesPerAxis,
          (f32(sy) + 0.5) * invSamplesPerAxis
        )) * invAtlasTexSize;

        let atlasBrightness = textureSampleLevel(fontAtlas, sourceSampler, atlasUV, 0.0).r;
        let sourceSample = sourceSamples[sy * samplesPerAxis + sx];

        // Squared difference (accumulate squared distance)
        let diff = sourceSample - atlasBrightness;
        spatialDistSq += diff * diff;
      }
    }

    // OPTIMIZATION: Skip sqrt - compare squared distances directly
    // Scale spatialDistSq to match indexDist range (both 0-1 roughly)
    // Mean squared error is already normalized by sample count conceptually
    let spatialDist = spatialDistSq * invTotalSamples;

    // Combined score: weighted sum of index-based distance and spatial distance
    let score = indexDist * uniforms.brightnessWeight + spatialDist * spatialWeight;

    if (score < bestScore) {
      bestScore = score;
      bestMatch = charIdx;
    }
  }

  // Write the best matching character index to the result buffer
  let cellIndex = cellY * uniforms.gridSize.x + cellX;
  matchResult[cellIndex] = bestMatch;
}
