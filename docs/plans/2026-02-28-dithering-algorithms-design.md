# Dithering Algorithm Expansion — Design

**Date:** 2026-02-28
**Status:** Approved

## Overview

Expand the Dithering effect from 4 methods (Bayer 2×2/4×4/8×8 + Posterize) to 9 methods by adding GPU-only ordered dithering patterns. Also add Intensity, Modulation, and Chromatic Effects controls to match Grainrad's feature set.

All new algorithms are implemented in the existing WGSL fragment shader — no CPU fallback, no extra passes, fully consistent with the `SinglePassEffect` architecture.

## Algorithm Set

| Method # | Name | GPU Implementation |
|---|------|----------------|
| 0 | Bayer 2×2 | existing |
| 1 | Bayer 4×4 | existing |
| 2 | Bayer 8×8 | existing |
| 3 | None (Posterize) | existing |
| 4 | Bayer 16×16 | `4*B8(x%8,y%8) + B2(x>>3,y>>3)` recursion formula |
| 5 | Clustered Dot | radial distance from center of 6×6 tile, normalized 0–1 |
| 6 | Interleaved Gradient | `fract(52.9829189 * fract(0.06711056*x + 0.00583715*y))` |
| 7 | Blue Noise | baked 16×16 void-and-cluster matrix (256 values) in shader |
| 8 | Crosshatch | diagonal-emphasis 8×8 ordered matrix |

Matrix Size slider is hidden for methods 4–8 (Bayer-only control).

## New Settings

### Intensity
- Slider, 0.0–2.0, default 1.0
- Scales the dither threshold pattern strength
- Applied to all methods

### Modulation
- Checkbox, default off
- Multiplies pattern intensity by local luminance
- Darker areas → stronger dithering; brighter areas → less

### Chromatic Effects
- **Enabled** toggle (default off)
- **Max Displace** slider, 0–20px, default 6
- **Red Channel** slider, 0–360°, default 23
- **Green Channel** slider, 0–360°, default 50
- **Blue Channel** slider, 0–360°, default 80

Implementation: when enabled, sample the input texture at three slightly offset UVs (one per channel, offset by `normalize(vec2(cos(angle), sin(angle))) * maxDisplace / resolution`), run dithering on each channel independently, recombine.

## Uniform Buffer Layout

Grows from 96 bytes (24 floats) to 112 bytes (28 floats). New fields fill existing padding slots first:

| Index | Field | Notes |
|-------|-------|-------|
| 0–1 | resolution | existing |
| 2 | method | existing |
| 3 | colorLevels | existing |
| 4 | matrixSize | existing |
| 5–11 | brightness/contrast/gamma/sat/hue/sharpness/blur | existing |
| 12 | colorMode | existing |
| 13 | useOriginalColors | existing |
| 14 | **intensity** | NEW (was padding) |
| 15 | **modulation** | NEW (was padding) |
| 16–18 | foregroundColor (vec3f) | existing, alignment preserved |
| 19 | **chromaticEnabled** | NEW (was padding) |
| 20–22 | backgroundColor (vec3f) | existing, alignment preserved |
| 23 | **chromaticMaxDisplace** | NEW (was padding) |
| 24 | **chromaticRedAngle** | NEW |
| 25 | **chromaticGreenAngle** | NEW |
| 26 | **chromaticBlueAngle** | NEW |
| 27 | (implicit padding) | — |

## Store Changes (`appStore.ts`)

7 new fields in `EffectSettings` and `defaultEffectSettings`:

```ts
ditheringIntensity: number;           // default 1.0
ditheringModulation: boolean;         // default false
ditheringChromaticEnabled: boolean;   // default false
ditheringChromaticMaxDisplace: number; // default 6
ditheringChromaticRedAngle: number;   // default 23
ditheringChromaticGreenAngle: number; // default 50
ditheringChromaticBlueAngle: number;  // default 80
```

## UI Changes (`SettingsPanel.tsx`)

- 5 new `<option>` entries in method select (Bayer 16×16, Clustered Dot, IGN, Blue Noise, Crosshatch)
- Matrix Size slider conditionally hidden when `method >= 4`
- Intensity slider added (all methods)
- Modulation checkbox added
- Chromatic Effects block: enabled toggle, then Max Displace + 3 angle sliders revealed when enabled
- All new fields wired to store via `updateEffectSettings`

## Files Changed

1. `ephapse/src/effects/ditheringEffect.ts` — shader + options interface + writeUniforms
2. `ephapse/src/store/appStore.ts` — EffectSettings interface + defaultEffectSettings
3. `ephapse/src/components/SettingsPanel.tsx` — new UI controls
