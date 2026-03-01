# Built-in Presets — Design

**Date:** 2026-02-28
**Status:** Approved

## Overview

Add 6 named built-in presets (Classic Terminal, Matrix, Retro CRT, High Detail, Minimal, Cyberpunk) matching Grainrad's feature set. Built-ins are hardcoded constants — never stored in localStorage, always available, read-only (no rename/delete).

## Architecture

**Option chosen: Static constants, not in store.**

`BUILTIN_PRESETS` is defined in a new `src/data/builtinPresets.ts` file as a plain array of `Preset` objects. The Zustand store gains one new action `loadPresetData(preset: Preset)` (applies any full preset object directly, without ID lookup). `loadPreset(id)` refactors to use `loadPresetData` internally. `PresetsPanel.tsx` renders a "Built-in Presets" section at the top, importing `BUILTIN_PRESETS` and calling `loadPresetData`.

Benefits: No versioning/migration burden, built-in changes take effect immediately for all users, clean separation from user data.

## Built-in Preset Definitions

All presets use `defaultCharacterSettings`, `defaultImageSettings`, `defaultAdvancedSettings`, and `defaultEffectSettings` as base, with only the fields that differ specified.

### 1. Classic Terminal

```ts
effect: 'ascii'
character: { charset: ' .:-=+*#%@', cellSize: 8, spacing: 0, brightnessMapping: 1, invert: false }
color: { mode: 'monochrome', foregroundColor: [0, 1, 0.25], backgroundColor: [0, 0, 0], useOriginalColors: false }
postProcessing: {
  bloom: { enabled: false, intensity: 0.5 },
  grain: { enabled: true, intensity: 20, size: 1, speed: 30 },
  chromatic: { enabled: false, offset: 2 },
  scanlines: { enabled: true, opacity: 0.25, spacing: 2 },
  vignette: { enabled: true, intensity: 0.4, radius: 0.7 },
  crtCurve: { enabled: false, amount: 0.1 },
  phosphor: { enabled: false, color: [0, 1, 0] },
}
```

### 2. Matrix

```ts
effect: 'matrixRain'
color: defaultColorSettings
effectSettings: {
  ...defaultEffectSettings,
  matrixRainCellSize: 14,
  matrixRainSpeed: 3,
  matrixRainTrailLength: 20,
  matrixRainColor: [0, 1, 0.25],
  matrixRainBgOpacity: 0.15,
  matrixRainGlowIntensity: 1.5,
}
postProcessing: {
  bloom: { enabled: true, intensity: 0.4 },
  grain: { enabled: false, intensity: 35, size: 2, speed: 50 },
  chromatic: { enabled: false, offset: 2 },
  scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
  vignette: { enabled: true, intensity: 0.5, radius: 0.75 },
  crtCurve: { enabled: false, amount: 0.1 },
  phosphor: { enabled: true, color: [0, 1, 0] },
}
```

### 3. Retro CRT

```ts
effect: 'ascii'
character: { charset: ' .:-=+*#%@', cellSize: 10, spacing: 0.1, brightnessMapping: 1, invert: false }
color: { mode: 'monochrome', foregroundColor: [1, 0.55, 0], backgroundColor: [0, 0, 0], useOriginalColors: false }
postProcessing: {
  bloom: { enabled: false, intensity: 0.5 },
  grain: { enabled: true, intensity: 25, size: 1, speed: 40 },
  chromatic: { enabled: false, offset: 2 },
  scanlines: { enabled: true, opacity: 0.35, spacing: 3 },
  vignette: { enabled: true, intensity: 0.6, radius: 0.65 },
  crtCurve: { enabled: true, amount: 0.12 },
  phosphor: { enabled: false, color: [0, 1, 0] },
}
```

### 4. High Detail

```ts
effect: 'ascii'
character: { charset: ' `.-\'":!|/\\(){}[]<>+*#%@$&^?~', cellSize: 5, spacing: 0, brightnessMapping: 1, invert: false }
color: { mode: 'original', foregroundColor: [1, 1, 1], backgroundColor: [0, 0, 0], useOriginalColors: true }
postProcessing: {
  ...defaultPostProcessingSettings,
  grain: { enabled: false, intensity: 35, size: 2, speed: 50 },
}
```

### 5. Minimal

```ts
effect: 'ascii'
character: { charset: '  .', cellSize: 16, spacing: 0.2, brightnessMapping: 1, invert: false }
color: { mode: 'monochrome', foregroundColor: [1, 1, 1], backgroundColor: [0, 0, 0], useOriginalColors: false }
postProcessing: {
  bloom: { enabled: false, intensity: 0.5 },
  grain: { enabled: false, intensity: 35, size: 2, speed: 50 },
  chromatic: { enabled: false, offset: 2 },
  scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
  vignette: { enabled: false, intensity: 0.5, radius: 0.7 },
  crtCurve: { enabled: false, amount: 0.1 },
  phosphor: { enabled: false, color: [0, 1, 0] },
}
```

### 6. Cyberpunk

```ts
effect: 'dithering'
color: { mode: 'color', foregroundColor: [0, 1, 1], backgroundColor: [0.1, 0, 0.2], useOriginalColors: true }
effectSettings: {
  ...defaultEffectSettings,
  ditheringMethod: 6,          // Interleaved Gradient Noise
  ditheringColorLevels: 4,
  ditheringIntensity: 1.3,
  ditheringModulation: true,
  ditheringChromaticEnabled: true,
  ditheringChromaticMaxDisplace: 8,
  ditheringChromaticRedAngle: 23,
  ditheringChromaticGreenAngle: 50,
  ditheringChromaticBlueAngle: 80,
}
postProcessing: {
  bloom: { enabled: false, intensity: 0.5 },
  grain: { enabled: true, intensity: 25, size: 1, speed: 50 },
  chromatic: { enabled: true, offset: 4 },
  scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
  vignette: { enabled: true, intensity: 0.45, radius: 0.7 },
  crtCurve: { enabled: false, amount: 0.1 },
  phosphor: { enabled: false, color: [0, 1, 0] },
}
```

## Store Change

Add one new action to the `AppState` interface and implementation:

```ts
loadPresetData: (preset: Preset) => void;
```

Refactor `loadPreset(id)` to extract its apply logic into `loadPresetData`:

```ts
loadPresetData: (preset) => {
  set({
    activeEffect: preset.effect,
    character: { ...preset.settings.character },
    image: { ...preset.settings.image },
    color: { ...preset.settings.color },
    advanced: { ...preset.settings.advanced },
    postProcessing: { ...preset.settings.postProcessing },
    effectSettings: { ...preset.settings.effectSettings },
  });
},

loadPreset: (id) => {
  const preset = get().presets.find((p) => p.id === id);
  if (!preset) return;
  get().loadPresetData(preset);
},
```

## UI Change (`PresetsPanel.tsx`)

New "Built-in Presets" section at the top of the panel (above Save Current Settings):

- Heading: "Built-in Presets" (same style as other section headings)
- 6 cards rendered from `BUILTIN_PRESETS`
- Same click-to-load behavior as user presets (calls `loadPresetData`)
- No rename/delete buttons
- Effect name shown as subtitle (e.g., "ASCII" / "Matrix Rain")
- loadedId flash animation on load (same as user presets)

## Files Changed

1. `ephapse/src/data/builtinPresets.ts` — new file, exports `BUILTIN_PRESETS: Preset[]`
2. `ephapse/src/store/appStore.ts` — add `loadPresetData` to interface + implementation, refactor `loadPreset`
3. `ephapse/src/components/PresetsPanel.tsx` — add built-in section, wire `loadPresetData`
