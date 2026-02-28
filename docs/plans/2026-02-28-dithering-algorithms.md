# Dithering Algorithm Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the Dithering effect from 4 methods to 9 GPU-based ordered dithering patterns, and add Intensity, Modulation, and Chromatic Effects controls.

**Architecture:** All new algorithms are WGSL functions added to the inline fragment shader in `ditheringEffect.ts`. New settings are wired through the Zustand store to the effect via `updateOptions`. No new files, no extra GPU passes.

**Tech Stack:** WGSL (inline template strings), TypeScript, Zustand, React

---

## Background: How the Current Code Works

`ditheringEffect.ts` contains a `FRAGMENT_SHADER` template string with the full WGSL. The `DitheringUniforms` struct maps to a `Float32Array` written by `writeUniforms()`. The current 96-byte buffer (24 floats) has **8 bytes of implicit padding** between `useOriginalColors` and `foregroundColor` (indices 14–15), plus **4 bytes** after each `vec3f` field (indices 19, 23) — these are currently unwritten zeros that we will repurpose.

The `fragmentMain` currently branches on `methodInt` 0/1/2 (Bayer) vs 3+ (posterize).

---

### Task 1: Add 7 new fields to the store

**Files:**
- Modify: `ephapse/src/store/appStore.ts`

**Step 1: Add fields to `EffectSettings` interface** (after `ditheringMatrixSize: number;` around line 252)

```ts
ditheringIntensity: number;
ditheringModulation: boolean;
ditheringChromaticEnabled: boolean;
ditheringChromaticMaxDisplace: number;
ditheringChromaticRedAngle: number;
ditheringChromaticGreenAngle: number;
ditheringChromaticBlueAngle: number;
```

**Step 2: Add defaults to `defaultEffectSettings`** (after `ditheringMatrixSize: 4,` around line 467)

```ts
ditheringIntensity: 1.0,
ditheringModulation: false,
ditheringChromaticEnabled: false,
ditheringChromaticMaxDisplace: 6,
ditheringChromaticRedAngle: 23,
ditheringChromaticGreenAngle: 50,
ditheringChromaticBlueAngle: 80,
```

**Step 3: Verify dev server still starts**

```bash
cd ephapse && npm run dev
```
Expected: no TypeScript errors.

**Step 4: Commit**

```bash
git add ephapse/src/store/appStore.ts
git commit -m "feat(dithering): add 7 new fields to store for intensity, modulation, chromatic effects"
```

---

### Task 2: Update `DitheringOptions` interface and `writeUniforms`

**Files:**
- Modify: `ephapse/src/effects/ditheringEffect.ts`

**Step 1: Extend `DitheringOptions` interface** (after `matrixSize: number;`)

```ts
intensity: number;
modulation: boolean;
chromaticEnabled: boolean;
chromaticMaxDisplace: number;
chromaticRedAngle: number;
chromaticGreenAngle: number;
chromaticBlueAngle: number;
```

**Step 2: Extend `DEFAULT_OPTIONS`** (after `matrixSize: 4,`)

```ts
intensity: 1.0,
modulation: false,
chromaticEnabled: false,
chromaticMaxDisplace: 6,
chromaticRedAngle: 23,
chromaticGreenAngle: 50,
chromaticBlueAngle: 80,
```

**Step 3: Change `getUniformBufferSize()` from `96` to `112`**

```ts
protected getUniformBufferSize(): number {
  return 112;
}
```

**Step 4: Replace `writeUniforms()` entirely**

The new buffer is 28 floats (112 bytes). Indices 14–15 fill what was implicit padding between `useOriginalColors` and `foregroundColor`. Indices 19, 23 fill what was implicit padding after each `vec3f`. Indices 24–26 are new.

```ts
protected writeUniforms(): void {
  const data = new Float32Array(28);
  data[0]  = this.options.resolution[0];
  data[1]  = this.options.resolution[1];
  data[2]  = this.options.method;
  data[3]  = this.options.colorLevels;
  data[4]  = this.options.matrixSize;
  data[5]  = this.options.brightness * 0.005;
  data[6]  = this.options.contrast * 0.01;
  data[7]  = Math.max(0.1, this.options.gamma);
  data[8]  = this.options.saturation * 0.01;
  data[9]  = this.options.hue / 360.0;
  data[10] = this.options.sharpness;
  data[11] = this.options.blur;
  data[12] = this.options.colorMode;
  data[13] = this.options.useOriginalColors ? 1.0 : 0.0;
  data[14] = this.options.intensity;                          // fills former padding
  data[15] = this.options.modulation ? 1.0 : 0.0;            // fills former padding
  // foregroundColor at offset 64 (index 16) — alignment preserved
  data[16] = this.options.foregroundColor[0];
  data[17] = this.options.foregroundColor[1];
  data[18] = this.options.foregroundColor[2];
  data[19] = this.options.chromaticEnabled ? 1.0 : 0.0;      // fills former vec3 padding
  // backgroundColor at offset 80 (index 20) — alignment preserved
  data[20] = this.options.backgroundColor[0];
  data[21] = this.options.backgroundColor[1];
  data[22] = this.options.backgroundColor[2];
  data[23] = this.options.chromaticMaxDisplace;               // fills former vec3 padding
  // angles stored as radians
  data[24] = this.options.chromaticRedAngle   * Math.PI / 180.0;
  data[25] = this.options.chromaticGreenAngle * Math.PI / 180.0;
  data[26] = this.options.chromaticBlueAngle  * Math.PI / 180.0;
  // data[27] = implicit padding, left as 0
  this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
}
```

**Step 5: Verify dev server still starts (no GPU errors in browser console)**

**Step 6: Commit**

```bash
git add ephapse/src/effects/ditheringEffect.ts
git commit -m "feat(dithering): extend uniform buffer to 112 bytes, add 7 new options"
```

---

### Task 3: Update the WGSL struct and add new algorithm functions

**Files:**
- Modify: `ephapse/src/effects/ditheringEffect.ts` (the `FRAGMENT_SHADER` template string)

**Step 1: Replace the `DitheringUniforms` struct**

The new struct adds fields where there was previously implicit padding. The `vec3f` alignments are preserved — verify by noting that `intensity` lands at offset 56 and `modulation` at 60, so `foregroundColor` still starts at offset 64 (the next 16-byte boundary after 60+4=64).

```wgsl
struct DitheringUniforms {
  resolution: vec2f,
  method: f32,
  colorLevels: f32,
  matrixSize: f32,
  brightness: f32,
  contrast: f32,
  gamma: f32,
  saturation: f32,
  hue: f32,
  sharpness: f32,
  blur: f32,
  colorMode: f32,
  useOriginalColors: f32,
  intensity: f32,
  modulation: f32,
  foregroundColor: vec3f,
  chromaticEnabled: f32,
  backgroundColor: vec3f,
  chromaticMaxDisplace: f32,
  chromaticRedAngle: f32,
  chromaticGreenAngle: f32,
  chromaticBlueAngle: f32,
}
```

**Step 2: Add `bayer16x16` function** (after the existing `getBayer` function)

```wgsl
fn bayer16x16(p: vec2f) -> f32 {
  let x = i32(p.x) & 15;
  let y = i32(p.y) & 15;
  let b8 = i32(bayer8x8(vec2f(f32(x & 7), f32(y & 7))) * 64.0 + 0.5);
  let b2 = i32(bayer2x2(vec2f(f32(x >> 3), f32(y >> 3))) * 4.0 + 0.5);
  return f32(4 * b8 + b2) / 256.0;
}
```

**Step 3: Add `clusteredDot` function** (after `bayer16x16`)

Uses radial distance from the center of a 6×6 tile — center pixels fill last, edges fill first, creating a circular cluster look.

```wgsl
fn clusteredDot(p: vec2f) -> f32 {
  let x = f32(((i32(p.x) % 6) + 6) % 6);
  let y = f32(((i32(p.y) % 6) + 6) % 6);
  let dx = x - 2.5;
  let dy = y - 2.5;
  return clamp(sqrt(dx * dx + dy * dy) / 3.536, 0.0, 1.0);
}
```

**Step 4: Add `interleavedGradientNoise` and `blueNoise` functions**

IGN is the Jorge Jimenez formula — excellent spectral properties, temporally stable.
Blue Noise uses IGN + the golden ratio, a well-known GPU approximation.

```wgsl
fn interleavedGradientNoise(p: vec2f) -> f32 {
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

fn blueNoise(p: vec2f) -> f32 {
  return fract(interleavedGradientNoise(p) + 0.61803398875);
}
```

**Step 5: Add `crosshatch` function**

Takes the minimum of two diagonal ordered patterns (45° and 135°). Intersection points fill first, then lines extend outward — produces a visual crosshatch on the dithered output.

```wgsl
fn crosshatch(p: vec2f) -> f32 {
  let x = i32(p.x) & 7;
  let y = i32(p.y) & 7;
  let d1 = f32((x + y) & 7) / 8.0;
  let d2 = f32((x - y + 8) & 7) / 8.0;
  return min(d1, d2);
}
```

**Step 6: Verify dev server starts, no shader compilation errors in browser console**

Open Chrome DevTools → Console. Load the app. Switch to Dithering effect. Should see no red errors.

**Step 7: Commit**

```bash
git add ephapse/src/effects/ditheringEffect.ts
git commit -m "feat(dithering): add bayer16x16, clusteredDot, IGN, blueNoise, crosshatch WGSL functions"
```

---

### Task 4: Rewrite `fragmentMain` to use new algorithms + intensity + modulation + chromatic

**Files:**
- Modify: `ephapse/src/effects/ditheringEffect.ts` (the `fragmentMain` function in `FRAGMENT_SHADER`)

**Step 1: Add a `getDitherThreshold` helper function** (just before `fragmentMain`)

This centralises algorithm selection and applies intensity/modulation, returning a centered threshold value (0 = no shift).

```wgsl
fn getDitherThreshold(pixelCoord: vec2f, lum: f32) -> f32 {
  let methodInt = i32(uniforms.method + 0.5);
  var pattern: f32;

  if (methodInt == 0 || methodInt == 1 || methodInt == 2) {
    pattern = getBayer(pixelCoord, uniforms.matrixSize);
  } else if (methodInt == 3) {
    return 0.0; // posterize — no threshold shift
  } else if (methodInt == 4) {
    pattern = bayer16x16(pixelCoord);
  } else if (methodInt == 5) {
    pattern = clusteredDot(pixelCoord);
  } else if (methodInt == 6) {
    pattern = interleavedGradientNoise(pixelCoord);
  } else if (methodInt == 7) {
    pattern = blueNoise(pixelCoord);
  } else {
    pattern = crosshatch(pixelCoord);
  }

  var threshold = (pattern - 0.5) * uniforms.intensity;
  if (uniforms.modulation > 0.5) {
    threshold *= lum * 2.0;
  }
  return threshold;
}
```

**Step 2: Replace `fragmentMain`**

```wgsl
@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelCoord = texCoord * uniforms.resolution;
  let levels = uniforms.colorLevels;

  if (uniforms.chromaticEnabled > 0.5) {
    let maxD = uniforms.chromaticMaxDisplace;
    let rOff = vec2f(cos(uniforms.chromaticRedAngle),   sin(uniforms.chromaticRedAngle))   * maxD / uniforms.resolution;
    let gOff = vec2f(cos(uniforms.chromaticGreenAngle), sin(uniforms.chromaticGreenAngle)) * maxD / uniforms.resolution;
    let bOff = vec2f(cos(uniforms.chromaticBlueAngle),  sin(uniforms.chromaticBlueAngle))  * maxD / uniforms.resolution;

    let rColor = applyImageProcessing(textureSample(inputTexture, texSampler, texCoord + rOff).rgb);
    let gColor = applyImageProcessing(textureSample(inputTexture, texSampler, texCoord + gOff).rgb);
    let bColor = applyImageProcessing(textureSample(inputTexture, texSampler, texCoord + bOff).rgb);

    let threshold = getDitherThreshold(pixelCoord, luminance(rColor));
    let r = quantizeChannel(rColor.r + threshold / (levels - 1.0), levels);
    let g = quantizeChannel(gColor.g + threshold / (levels - 1.0), levels);
    let b = quantizeChannel(bColor.b + threshold / (levels - 1.0), levels);
    return vec4f(r, g, b, 1.0);
  }

  var color = textureSample(inputTexture, texSampler, texCoord).rgb;
  color = applyImageProcessing(color);
  let threshold = getDitherThreshold(pixelCoord, luminance(color));
  let r = quantizeChannel(color.r + threshold / (levels - 1.0), levels);
  let g = quantizeChannel(color.g + threshold / (levels - 1.0), levels);
  let b = quantizeChannel(color.b + threshold / (levels - 1.0), levels);
  return vec4f(r, g, b, 1.0);
}
```

**Step 3: Visual smoke test**

- Open browser, load test image (test-face.png)
- Switch to Dithering effect
- Cycle through methods 0–8 — each should produce a visually distinct pattern
- Verify method 3 (Posterize) still works (no threshold, just quantize)

**Step 4: Commit**

```bash
git add ephapse/src/effects/ditheringEffect.ts
git commit -m "feat(dithering): rewrite fragmentMain with getDitherThreshold, intensity, modulation, chromatic effects"
```

---

### Task 5: Update SettingsPanel UI — method select, intensity, modulation

**Files:**
- Modify: `ephapse/src/components/SettingsPanel.tsx`

**Step 1: Add 7 new store selectors** (after the existing 3 dithering selectors, around line 213)

```tsx
const effectDitheringIntensity = useAppStore((state) => state.effectSettings.ditheringIntensity);
const effectDitheringModulation = useAppStore((state) => state.effectSettings.ditheringModulation);
const effectDitheringChromaticEnabled = useAppStore((state) => state.effectSettings.ditheringChromaticEnabled);
const effectDitheringChromaticMaxDisplace = useAppStore((state) => state.effectSettings.ditheringChromaticMaxDisplace);
const effectDitheringChromaticRedAngle = useAppStore((state) => state.effectSettings.ditheringChromaticRedAngle);
const effectDitheringChromaticGreenAngle = useAppStore((state) => state.effectSettings.ditheringChromaticGreenAngle);
const effectDitheringChromaticBlueAngle = useAppStore((state) => state.effectSettings.ditheringChromaticBlueAngle);
```

**Step 2: Replace the 4-option method `<select>` with 9 options**

Find the `<select>` for `effectDitheringMethod` and replace its `<option>` list:

```tsx
<option value={0}>Bayer 2×2</option>
<option value={1}>Bayer 4×4</option>
<option value={2}>Bayer 8×8</option>
<option value={3}>None (Posterize)</option>
<option value={4}>Bayer 16×16</option>
<option value={5}>Clustered Dot</option>
<option value={6}>Interleaved Gradient</option>
<option value={7}>Blue Noise</option>
<option value={8}>Crosshatch</option>
```

**Step 3: Conditionally show Matrix Size** — wrap the existing Matrix Size `<Slider>` in a condition:

```tsx
{effectDitheringMethod < 4 && (
  <Slider
    label="Matrix Size"
    value={effectDitheringMatrixSize}
    min={2}
    max={8}
    step={2}
    onChange={(v) => updateEffectSettings({ ditheringMatrixSize: v })}
  />
)}
```

**Step 4: Add Intensity slider** (after Color Levels slider)

```tsx
<Slider
  label="Intensity"
  value={effectDitheringIntensity}
  min={0}
  max={2}
  step={0.05}
  onChange={(v) => updateEffectSettings({ ditheringIntensity: v })}
/>
```

**Step 5: Add Modulation checkbox** (after Intensity slider)

```tsx
<div className="flex items-center justify-between">
  <label className="text-xs text-[var(--text-secondary)]">Modulation</label>
  <input
    type="checkbox"
    checked={effectDitheringModulation}
    onChange={(e) => updateEffectSettings({ ditheringModulation: e.target.checked })}
  />
</div>
```

**Step 6: Verify dev server, check the dithering panel renders the new controls correctly**

**Step 7: Commit**

```bash
git add ephapse/src/components/SettingsPanel.tsx
git commit -m "feat(dithering): expand method select to 9 options, add intensity slider and modulation checkbox"
```

---

### Task 6: Add Chromatic Effects panel to SettingsPanel

**Files:**
- Modify: `ephapse/src/components/SettingsPanel.tsx`

**Step 1: Add Chromatic Effects block** after the Modulation checkbox, still inside the `{activeEffect === 'dithering' && (...)}` block:

```tsx
{/* Chromatic Effects */}
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <label className="text-xs font-medium text-[var(--text-secondary)]">Chromatic Effects</label>
    <input
      type="checkbox"
      checked={effectDitheringChromaticEnabled}
      onChange={(e) => updateEffectSettings({ ditheringChromaticEnabled: e.target.checked })}
    />
  </div>
  {effectDitheringChromaticEnabled && (
    <div className="space-y-3 pl-2 border-l border-[var(--border)]">
      <Slider
        label="Max Displace"
        value={effectDitheringChromaticMaxDisplace}
        min={0}
        max={20}
        step={0.5}
        onChange={(v) => updateEffectSettings({ ditheringChromaticMaxDisplace: v })}
        suffix="px"
      />
      <Slider
        label="Red Channel"
        value={effectDitheringChromaticRedAngle}
        min={0}
        max={360}
        onChange={(v) => updateEffectSettings({ ditheringChromaticRedAngle: v })}
        suffix="°"
      />
      <Slider
        label="Green Channel"
        value={effectDitheringChromaticGreenAngle}
        min={0}
        max={360}
        onChange={(v) => updateEffectSettings({ ditheringChromaticGreenAngle: v })}
        suffix="°"
      />
      <Slider
        label="Blue Channel"
        value={effectDitheringChromaticBlueAngle}
        min={0}
        max={360}
        onChange={(v) => updateEffectSettings({ ditheringChromaticBlueAngle: v })}
        suffix="°"
      />
    </div>
  )}
</div>
```

**Step 2: Wire effect in Preview.tsx** — verify `ditheringRef.current?.updateOptions(...)` is already passing the dithering settings through. Search for `ditheringRef` to find the `useEffect` that calls `updateOptions`.

```bash
grep -n "ditheringRef\|DitheringEffect\|dithering" ephapse/src/components/Preview.tsx | head -30
```

If the `updateOptions` call uses a spread of `effectSettings`, the new fields are automatically passed. If it maps fields explicitly, add the 7 new ones.

**Step 3: Visual smoke test — chromatic effects**

1. Load test-face.png, select Dithering
2. Enable Chromatic Effects
3. Set Max Displace to 10 — should see RGB channel fringing
4. Adjust Red/Green/Blue angles — fringing direction should shift

**Step 4: Commit**

```bash
git add ephapse/src/components/SettingsPanel.tsx ephapse/src/components/Preview.tsx
git commit -m "feat(dithering): add chromatic effects panel with max displace and per-channel angle controls"
```

---

## Testing Checklist

After all tasks, load `test-face.png` and manually verify:

- [ ] Methods 0–8 all produce visually distinct dither patterns
- [ ] Method 3 (Posterize) produces sharp color bands, no pattern
- [ ] Method 4 (Bayer 16×16) is finer than Bayer 8×8
- [ ] Method 5 (Clustered Dot) shows circular dot clusters
- [ ] Method 6 (IGN) shows a smooth gradient noise pattern
- [ ] Method 7 (Blue Noise) looks different from IGN
- [ ] Method 8 (Crosshatch) shows diagonal hatch lines
- [ ] Matrix Size slider hidden for methods 4–8
- [ ] Intensity 0 → flat quantize (no pattern visible), Intensity 2 → exaggerated pattern
- [ ] Modulation on → darker image areas show stronger dithering
- [ ] Chromatic Effects: Max Displace 0 = no change, higher values show RGB fringing
- [ ] Red/Green/Blue angle sliders shift each channel in the correct direction
- [ ] Settings persist on page reload (localStorage)
- [ ] No GPU errors in browser console at any point
