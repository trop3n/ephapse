
  _S = `
${ta}

struct WaveLinesUniforms {
  resolution: vec2f,       // offset 0
  lineCount: f32,          // offset 8: 10 - 150
  amplitude: f32,          // offset 12: 5 - 50 pixels
  frequency: f32,          // offset 16: 0.5 - 3.0
  time: f32,               // offset 20: Animation time
  direction: f32,          // offset 24: 0 = horizontal, 1 = vertical
  lineThickness: f32,      // offset 28: 0.2 - 1.0
  brightness: f32,         // offset 32
  contrast: f32,           // offset 36
  colorMode: f32,          // offset 40: 0 = original, 1 = bw, 2 = custom
  fgColorR: f32,           // offset 44
  fgColorG: f32,           // offset 48
  fgColorB: f32,           // offset 52
  bgColorR: f32,           // offset 56
  bgColorG: f32,           // offset 60
  bgColorB: f32,           // offset 64
  animate: f32,            // offset 68: 0 or 1
  _pad: vec3f,             // padding
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: WaveLinesUniforms;

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
  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyBrightnessContrast(color, uniforms.brightness, uniforms.contrast);

  let brightness = luminance(color);
  let pixelPos = texCoord * uniforms.resolution;

  // Animation time (0 if animation disabled)
  var animTime = 0.0;
  if (uniforms.animate > 0.5) {
    animTime = uniforms.time;
  }

  var lineSpacing: f32;
  var lineIndex: f32;
  var wavePhase: f32;
  var waveOffset: f32;
  var lineY: f32;
  var distFromLine: f32;
  var lineThickness: f32;

  if (uniforms.direction < 0.5) {
    // Horizontal lines
    lineSpacing = uniforms.resolution.y / uniforms.lineCount;
    lineIndex = floor(pixelPos.y / lineSpacing);
    wavePhase = (pixelPos.x / uniforms.resolution.x) * 6.28318 * uniforms.frequency;
    waveOffset = sin(wavePhase + animTime) * uniforms.amplitude * brightness;
    lineY = (lineIndex + 0.5) * lineSpacing + waveOffset;
    distFromLine = abs(pixelPos.y - lineY);
    lineThickness = lineSpacing * uniforms.lineThickness * brightness;
  } else {
    // Vertical lines
    lineSpacing = uniforms.resolution.x / uniforms.lineCount;
    lineIndex = floor(pixelPos.x / lineSpacing);
    wavePhase = (pixelPos.y / uniforms.resolution.y) * 6.28318 * uniforms.frequency;
    waveOffset = sin(wavePhase + animTime) * uniforms.amplitude * brightness;
    let lineX = (lineIndex + 0.5) * lineSpacing + waveOffset;
    distFromLine = abs(pixelPos.x - lineX);
    lineThickness = lineSpacing * uniforms.lineThickness * brightness;
  }

  let bgColor = vec3f(uniforms.bgColorR, uniforms.bgColorG, uniforms.bgColorB);
  let fgColor = vec3f(uniforms.fgColorR, uniforms.fgColorG, uniforms.fgColorB);

  if (distFromLine < lineThickness) {
    // Inside line
    let colorModeInt = i32(uniforms.colorMode + 0.5);
    if (colorModeInt == 1) {
      // B&W
      return vec4f(vec3f(brightness), 1.0);
    } else if (colorModeInt == 2) {
      // Custom color
      return vec4f(fgColor, 1.0);
    } else {
      // Original color
      return vec4f(color, 1.0);
    }
  }

  return vec4f(bgColor, 1.0);
}
