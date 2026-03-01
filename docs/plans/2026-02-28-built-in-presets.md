# Built-in Presets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 hardcoded built-in presets (Classic Terminal, Matrix, Retro CRT, High Detail, Minimal, Cyberpunk) that appear in the Presets panel and are always available, read-only, and never stored in localStorage.

**Architecture:** Built-in presets are static constants in a new `src/data/builtinPresets.ts` file using the `Preset` type from the store. A new `loadPresetData(preset: Preset)` action is added to the store so any full preset object can be applied directly without an ID lookup. `PresetsPanel.tsx` renders a "Built-in Presets" section at the top using this action.

**Tech Stack:** React 19, TypeScript, Zustand. No new libraries. Build check: `cd ephapse && npm run build`.

---

### Task 1: Export default settings constants from appStore and create builtinPresets.ts

**Files:**
- Modify: `ephapse/src/store/appStore.ts` (add `export` to 6 default constant declarations)
- Create: `ephapse/src/data/builtinPresets.ts`

**Step 1: Export the 6 default constants in `appStore.ts`**

In `ephapse/src/store/appStore.ts`, change these 6 lines (around line 336) from `const` to `export const`:

```ts
// BEFORE:
const defaultCharacterSettings: CharacterSettings = {
const defaultImageSettings: ImageSettings = {
const defaultColorSettings: ColorSettings = {
const defaultAdvancedSettings: AdvancedSettings = {
const defaultPostProcessingSettings: PostProcessingSettings = {
const defaultEffectSettings: EffectSettings = {

// AFTER: add `export` to each:
export const defaultCharacterSettings: CharacterSettings = {
export const defaultImageSettings: ImageSettings = {
export const defaultColorSettings: ColorSettings = {
export const defaultAdvancedSettings: AdvancedSettings = {
export const defaultPostProcessingSettings: PostProcessingSettings = {
export const defaultEffectSettings: EffectSettings = {
```

**Step 2: Create `ephapse/src/data/builtinPresets.ts`**

Create this file with exact content:

```ts
import type { Preset } from '../store/appStore';
import {
  defaultCharacterSettings,
  defaultImageSettings,
  defaultAdvancedSettings,
  defaultEffectSettings,
} from '../store/appStore';

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'builtin-classic-terminal',
    name: 'Classic Terminal',
    effect: 'ascii',
    createdAt: 0,
    settings: {
      character: { charset: ' .:-=+*#%@', cellSize: 8, spacing: 0, brightnessMapping: 1, invert: false },
      image: { ...defaultImageSettings },
      color: { mode: 'monochrome', foregroundColor: [0, 1, 0.25], backgroundColor: [0, 0, 0], useOriginalColors: false },
      advanced: { ...defaultAdvancedSettings },
      postProcessing: {
        bloom: { enabled: false, intensity: 0.5 },
        grain: { enabled: true, intensity: 20, size: 1, speed: 30 },
        chromatic: { enabled: false, offset: 2 },
        scanlines: { enabled: true, opacity: 0.25, spacing: 2 },
        vignette: { enabled: true, intensity: 0.4, radius: 0.7 },
        crtCurve: { enabled: false, amount: 0.1 },
        phosphor: { enabled: false, color: [0, 1, 0] },
      },
      effectSettings: { ...defaultEffectSettings },
    },
  },
  {
    id: 'builtin-matrix',
    name: 'Matrix',
    effect: 'matrixRain',
    createdAt: 0,
    settings: {
      character: { ...defaultCharacterSettings },
      image: { ...defaultImageSettings },
      color: { mode: 'color', foregroundColor: [0, 1, 0], backgroundColor: [0, 0, 0], useOriginalColors: false },
      advanced: { ...defaultAdvancedSettings },
      postProcessing: {
        bloom: { enabled: true, intensity: 0.4 },
        grain: { enabled: false, intensity: 35, size: 2, speed: 50 },
        chromatic: { enabled: false, offset: 2 },
        scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
        vignette: { enabled: true, intensity: 0.5, radius: 0.75 },
        crtCurve: { enabled: false, amount: 0.1 },
        phosphor: { enabled: true, color: [0, 1, 0] },
      },
      effectSettings: {
        ...defaultEffectSettings,
        matrixRainCellSize: 14,
        matrixRainSpeed: 3,
        matrixRainTrailLength: 20,
        matrixRainColor: [0, 1, 0.25],
        matrixRainBgOpacity: 0.15,
        matrixRainGlowIntensity: 1.5,
      },
    },
  },
  {
    id: 'builtin-retro-crt',
    name: 'Retro CRT',
    effect: 'ascii',
    createdAt: 0,
    settings: {
      character: { charset: ' .:-=+*#%@', cellSize: 10, spacing: 0.1, brightnessMapping: 1, invert: false },
      image: { ...defaultImageSettings },
      color: { mode: 'monochrome', foregroundColor: [1, 0.55, 0], backgroundColor: [0, 0, 0], useOriginalColors: false },
      advanced: { ...defaultAdvancedSettings },
      postProcessing: {
        bloom: { enabled: false, intensity: 0.5 },
        grain: { enabled: true, intensity: 25, size: 1, speed: 40 },
        chromatic: { enabled: false, offset: 2 },
        scanlines: { enabled: true, opacity: 0.35, spacing: 3 },
        vignette: { enabled: true, intensity: 0.6, radius: 0.65 },
        crtCurve: { enabled: true, amount: 0.12 },
        phosphor: { enabled: false, color: [0, 1, 0] },
      },
      effectSettings: { ...defaultEffectSettings },
    },
  },
  {
    id: 'builtin-high-detail',
    name: 'High Detail',
    effect: 'ascii',
    createdAt: 0,
    settings: {
      character: { charset: " `.-'\":!|/\\(){}[]<>+*#%@$&^?~", cellSize: 5, spacing: 0, brightnessMapping: 1, invert: false },
      image: { ...defaultImageSettings },
      color: { mode: 'original', foregroundColor: [1, 1, 1], backgroundColor: [0, 0, 0], useOriginalColors: true },
      advanced: { ...defaultAdvancedSettings },
      postProcessing: {
        bloom: { enabled: false, intensity: 0.5 },
        grain: { enabled: false, intensity: 35, size: 2, speed: 50 },
        chromatic: { enabled: false, offset: 2 },
        scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
        vignette: { enabled: false, intensity: 0.5, radius: 0.7 },
        crtCurve: { enabled: false, amount: 0.1 },
        phosphor: { enabled: false, color: [0, 1, 0] },
      },
      effectSettings: { ...defaultEffectSettings },
    },
  },
  {
    id: 'builtin-minimal',
    name: 'Minimal',
    effect: 'ascii',
    createdAt: 0,
    settings: {
      character: { charset: '  .', cellSize: 16, spacing: 0.2, brightnessMapping: 1, invert: false },
      image: { ...defaultImageSettings },
      color: { mode: 'monochrome', foregroundColor: [1, 1, 1], backgroundColor: [0, 0, 0], useOriginalColors: false },
      advanced: { ...defaultAdvancedSettings },
      postProcessing: {
        bloom: { enabled: false, intensity: 0.5 },
        grain: { enabled: false, intensity: 35, size: 2, speed: 50 },
        chromatic: { enabled: false, offset: 2 },
        scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
        vignette: { enabled: false, intensity: 0.5, radius: 0.7 },
        crtCurve: { enabled: false, amount: 0.1 },
        phosphor: { enabled: false, color: [0, 1, 0] },
      },
      effectSettings: { ...defaultEffectSettings },
    },
  },
  {
    id: 'builtin-cyberpunk',
    name: 'Cyberpunk',
    effect: 'dithering',
    createdAt: 0,
    settings: {
      character: { ...defaultCharacterSettings },
      image: { ...defaultImageSettings },
      color: { mode: 'color', foregroundColor: [0, 1, 1], backgroundColor: [0.1, 0, 0.2], useOriginalColors: true },
      advanced: { ...defaultAdvancedSettings },
      postProcessing: {
        bloom: { enabled: false, intensity: 0.5 },
        grain: { enabled: true, intensity: 25, size: 1, speed: 50 },
        chromatic: { enabled: true, offset: 4 },
        scanlines: { enabled: false, opacity: 0.3, spacing: 4 },
        vignette: { enabled: true, intensity: 0.45, radius: 0.7 },
        crtCurve: { enabled: false, amount: 0.1 },
        phosphor: { enabled: false, color: [0, 1, 0] },
      },
      effectSettings: {
        ...defaultEffectSettings,
        ditheringMethod: 6,
        ditheringColorLevels: 4,
        ditheringIntensity: 1.3,
        ditheringModulation: true,
        ditheringChromaticEnabled: true,
        ditheringChromaticMaxDisplace: 8,
        ditheringChromaticRedAngle: 23,
        ditheringChromaticGreenAngle: 50,
        ditheringChromaticBlueAngle: 80,
      },
    },
  },
];
```

**Step 3: Verify build compiles**

```bash
cd ephapse && npm run build
```
Expected: clean build, no TypeScript errors.

**Step 4: Commit**

```bash
git add ephapse/src/store/appStore.ts ephapse/src/data/builtinPresets.ts
git commit -m "add builtinPresets data file and export default settings constants"
```

---

### Task 2: Add `loadPresetData` action to the store

**Files:**
- Modify: `ephapse/src/store/appStore.ts`

The store's `AppState` interface currently has `loadPreset: (id: string) => void`. We're adding `loadPresetData: (preset: Preset) => void` and refactoring `loadPreset` to use it.

**Step 1: Add `loadPresetData` to the `AppState` interface**

In `ephapse/src/store/appStore.ts`, find the `// Preset actions` comment area (around line 316). Add the new action to the interface:

```ts
// BEFORE:
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;

// AFTER:
  loadPresetData: (preset: Preset) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
```

**Step 2: Implement `loadPresetData` and refactor `loadPreset`**

In `ephapse/src/store/appStore.ts`, find the `loadPreset` implementation (around line 613) and replace it:

```ts
// BEFORE:
      loadPreset: (id) => {
        const state = get();
        const preset = state.presets.find((p) => p.id === id);
        if (!preset) return;

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

// AFTER:
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

**Step 3: Verify build compiles**

```bash
cd ephapse && npm run build
```
Expected: clean build.

**Step 4: Commit**

```bash
git add ephapse/src/store/appStore.ts
git commit -m "add loadPresetData action to store, refactor loadPreset to use it"
```

---

### Task 3: Add Built-in Presets section to PresetsPanel

**Files:**
- Modify: `ephapse/src/components/PresetsPanel.tsx`

**Step 1: Update imports at the top of `PresetsPanel.tsx`**

```ts
// ADD these two imports (after existing imports):
import { BUILTIN_PRESETS } from '../data/builtinPresets';
```

Also add `loadPresetData` to the store selector block:

```ts
// ADD after the existing `const resetCurrentEffect = ...` line:
const loadPresetData = useAppStore((state) => state.loadPresetData);
```

**Step 2: Add built-in presets section**

In `PresetsPanel.tsx`, find the `<div className="flex-1 overflow-y-auto p-3 space-y-4">` opening tag. Add the new section as the first child, before the "Reset to Default" button block:

```tsx
        {/* Built-in Presets */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-[var(--text-secondary)]">
            Built-in Presets
          </h3>
          <div className="space-y-1">
            {BUILTIN_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className={`p-2 rounded bg-[var(--bg-tertiary)] border ${
                  loadedId === preset.id
                    ? 'border-[var(--accent)]'
                    : 'border-transparent'
                }`}
              >
                <button
                  onClick={() => {
                    loadPresetData(preset);
                    setLoadedId(preset.id);
                    setTimeout(() => setLoadedId(null), 1500);
                  }}
                  className="w-full text-left text-sm font-medium hover:text-[var(--accent)] transition-colors"
                >
                  {preset.name}
                </button>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {EFFECT_NAMES[preset.effect] || preset.effect}
                </p>
              </div>
            ))}
          </div>
        </div>
```

**Step 3: Also update the empty-state message**

The current empty-state reads "No presets saved". Since built-ins are always shown, this message should only appear for the user-presets section. The empty-state div is at the bottom (currently guards on `presets.length === 0`). Change the guard so it doesn't hide the whole panel:

Find this block and remove it (or replace with an empty user-presets placeholder):

```tsx
        {presets.length === 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <p className="text-sm">No presets saved</p>
            <p className="text-xs mt-1">Save your current settings to create a preset</p>
          </div>
        )}
```

Replace with a smaller inline hint in the user-presets area instead (this will be natural once the user-presets sections only show when there are user presets — the existing code already guards those sections with `currentEffectPresets.length > 0`). Simply delete the empty-state block.

**Step 4: Verify build compiles**

```bash
cd ephapse && npm run build
```
Expected: clean build, no TypeScript errors.

**Step 5: Manual verification**

1. Run `npm run dev` and open the app
2. Open the Presets panel (click presets toggle if collapsed)
3. Verify "Built-in Presets" section appears at top with all 6 entries
4. Click "Classic Terminal" — should switch to ASCII effect, apply monochrome green color, grain + scanlines on
5. Click "Matrix" — should switch to Matrix Rain effect, phosphor + bloom on
6. Click "Retro CRT" — should switch to ASCII, amber color, scanlines + CRT curve on
7. Click "Cyberpunk" — should switch to Dithering, chromatic effects enabled
8. Verify clicking a preset shows the accent-colored border flash briefly
9. Verify user-created presets still work (save/load/delete/rename unchanged)

**Step 6: Commit**

```bash
git add ephapse/src/components/PresetsPanel.tsx
git commit -m "add built-in presets section to PresetsPanel"
```
