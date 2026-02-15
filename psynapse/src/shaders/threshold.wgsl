
  jS = `
${ta}

struct ThresholdUniforms {
  resolution: vec2f,       // offset 0
  levels: f32,             // offset 8: 2 - 8, number of posterization levels
  dither: f32,             // offset 12: 0 = no dither, 1 = add subtle dither
  thresholdPoint: f32,     // offset 16: 0 - 1, where the cutoff happens (for 2-level)
  brightness: f32,         // offset 20
  contrast: f32,           // offset 24
  invert: f32,             // offset 28: 0 or 1
  fgColorR: f32,           // offset 32
  fgColorG: f32,           // offset 36
  fgColorB: f32,           // offset 40
  bgColorR: f32,           // offset 44
  bgColorG: f32,           // offset 48
  bgColorB: f32,           // offset 52
  colorMode: f32,          // offset 56: 0 = custom colors, 1 = preserve colors
  _pad: vec3f,             // padding
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ThresholdUniforms;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn applyBrightnessContrast(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
  var result = color + vec3f(brightness);
  let contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

fn bayer4(p: vec2u) -> f32 {
  let m = array<f32, 16>(
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
  );
  return m[p.x + p.y * 4u] / 16.0;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  let pixelPos = vec2u(texCoord * uniforms.resolution);

  // Apply brightness and contrast
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  var adjusted = color;

  // Add dither if enabled
  if (uniforms.dither > 0.5) {
    let ditherVal = (bayer4(pixelPos % 4u) - 0.5) * 0.1;
    adjusted = adjusted + vec3f(ditherVal);
  }

  let levels = max(uniforms.levels, 2.0);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);
  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);

  if (levels <= 2.0) {
    // Pure black and white / two-color mode
    let brightness = luminance(adjusted);
    var isLight = brightness > uniforms.thresholdPoint;

    if (uniforms.invert > 0.5) {
      isLight = !isLight;
    }

    if (uniforms.colorMode > 0.5) {
      // Preserve colors mode - show original or black
      if (isLight) {
        return vec4f(color, 1.0);
      } else {
        return vec4f(vec3f(0.0), 1.0);
      }
    } else {
      // Custom colors mode
      if (isLight) {
        return vec4f(fgColor, 1.0);
      } else {
        return vec4f(bgColor, 1.0);
      }
    }
  } else {
    // Posterization with multiple levels
    var posterized = floor(adjusted * (levels - 1.0) + 0.5) / (levels - 1.0);

    if (uniforms.invert > 0.5) {
      posterized = vec3f(1.0) - posterized;
    }

    if (uniforms.colorMode > 0.5) {
      // Preserve colors
      return vec4f(clamp(posterized, vec3f(0.0), vec3f(1.0)), 1.0);
    } else {
      // Apply color tint based on brightness
      let brightness = luminance(posterized);
      let tintedColor = mix(bgColor, fgColor, brightness);
      return vec4f(tintedColor, 1.0);
    }
  }
}
