# Grainrad vs Ephapse — Feature Gap Analysis

Deep analysis of https://grainrad.com/ conducted via Playwright on 2026-02-27.
Screenshots stored in project root as `grainrad-*.png`.

## UI Layout

Grainrad uses a 3-column layout:
- **Left sidebar**: Input, Effects list, Presets
- **Center**: Canvas preview + zoom controls
- **Right sidebar**: Settings (per-effect), Processing (pre-processing), Post-Processing, Export

Ephapse broadly matches this layout. Key differences are in the *content* of each panel.

---

## 1. Input

### Grainrad
- Accepts: PNG, JPG, GIF, MP4, WebM, **GLB** (3D model)
- Webcam support
- Drop zone + click to browse

### Ephapse
- Accepts: PNG, JPG, GIF, MP4, WebM (no GLB)
- Webcam support

**Gap**: No GLB/3D model input support.

---

## 2. Effects List

Both apps share the same 15 effects in the same order:
ASCII, Dithering, Halftone, Matrix Rain, Dots, Contour, Pixel Sort, Blockify,
Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, VHS.

No new effects to add here.

---

## 3. Settings Panel Architecture

This is the most important structural difference.

### Grainrad — per-effect Settings
Each effect panel in Grainrad contains:
1. **Effect-specific parameters** (top)
2. **Adjustments** — per-effect image adjustments: Brightness, Contrast, Saturation, Hue Rotation, Sharpness, Gamma
3. **Color** — per-effect color mode + colors

### Ephapse — global Settings
Ephapse has a single global Settings panel with:
- **Character** section (ASCII-only sliders shown to all effects)
- **Image** section (global adjustments)
- **Color** section (global color mode)
- **Advanced** section
- **Post-Processing** section

**Gaps**:
- In Grainrad the Adjustments (brightness/contrast/etc.) are per-effect, stored with each effect independently. Ephapse applies the same global image adjustments to every effect.
- The Character section in ephapse's Settings panel is ASCII-specific but visible even when non-ASCII effects are active. Grainrad only shows relevant controls per effect.
- Ephapse's Advanced section (Edge Enhance, Quantize Colors, Shape Matching, Spatial Weight, Match Quality) appears to be ASCII-specific logic that in Grainrad is part of the Processing section visible to all effects.

---

## 4. ASCII Effect

### Grainrad Settings
- **Scale** slider (= cell size in ephapse, labeled differently)
- **Spacing** slider
- **Output Width** slider — forces a specific column count, overriding scale
- **Character Set** dropdown with 10 presets: STANDARD, BLOCKS, BINARY, DETAILED, MINIMAL, ALPHABETIC, NUMERIC, MATH, SYMBOLS, CUSTOM
- **Adjustments** (Brightness, Contrast, Saturation, Hue Rotation, Sharpness, Gamma)
- **Color**: Mode dropdown (Mono / Original), Background color picker, Intensity slider

### Ephapse
- Cell Size slider
- Spacing slider
- Brightness Mapping slider
- Invert checkbox
- `charset` string (free text input)
- Color Mode: 'color' | 'grayscale' | 'monochrome' | 'sepia' | 'original' (5 options)

**Gaps**:
- No **Output Width** control (force column count)
- No **Character Set presets dropdown** — only a free-text string. Grainrad has named presets (BLOCKS, BINARY, DETAILED, MINIMAL, ALPHABETIC, NUMERIC, MATH, SYMBOLS, CUSTOM)
- Grainrad's Color Mode for ASCII is simpler: only **Mono** and **Original** (2 options). Ephapse has 5 but they may not all be meaningful for ASCII.
- Grainrad shows a **Background color** + **Intensity** slider in the Color section of ASCII

---

## 5. Dithering Effect

### Grainrad Settings
- **Algorithm** dropdown — 16 options (scrollable, partial list visible):
  - Floyd-Steinberg, Atkinson, Jarvis-Judice-Ninke, Stucki, Burkes, Sierra, Sierra Two-Row, Sierra Lite
  - Bayer 2x2, Bayer 4x4, Bayer 8x8
  - Clustered Dot, Blue Noise, Interleaved Gradient, Crosshatch *(+ possibly more)*
- **Intensity** slider (1.0 default)
- **Matrix Size** dropdown: 4x4 (Medium), 2x2, 8x8, 16x16
- **Modulation** checkbox
- **Adjustments**: Brightness, Contrast, Gamma, Sharpen
- **Color**: Mode (Mono/Original), Foreground color, Background color
- **Chromatic Effects** subsection (unique to Dithering):
  - Enabled checkbox
  - Max Displace slider (px)
  - Red Channel slider (0-100, angle/offset)
  - Green Channel slider
  - Blue Channel slider
  - Reset button

### Ephapse
- Method (mapped to `ditheringMethod: number`) — only 3 Bayer variants + a quantize fallback (4 options total)
- Color Levels slider
- Matrix Size slider
- Color mode, foreground/background colors

**Gaps**:
- Missing **~12 dithering algorithms**: Floyd-Steinberg, Atkinson, Jarvis-Judice-Ninke, Stucki, Burkes, Sierra, Sierra Two-Row, Sierra Lite, Clustered Dot, Blue Noise, Interleaved Gradient, Crosshatch
- Missing **Intensity** slider
- Missing **Modulation** checkbox
- Missing **Chromatic Effects** subsection (per-channel RGB displacement — Red/Green/Blue channel offsets + Max Displace)
- Missing per-effect Adjustments (currently only global)

---

## 6. Halftone Effect

### Grainrad Settings
- Spacing, Angle sliders
- **Shape** dropdown: Circle, Square, Diamond, Line (4 shapes)
- Adjustments, Color sections

### Ephapse
- Spacing, Angle sliders
- Shape (number: 0-3, matching the 4 grainrad options)
- Invert checkbox, Color Mode, Foreground/Background colors

**Gaps**: Mostly in parity. Ephapse has invert which grainrad may not show explicitly. Otherwise the 4 shapes match.

---

## 7. Matrix Rain Effect

### Grainrad Settings
- Cell Size (Scale)
- Speed slider
- **Trail Length** slider
- **Direction** dropdown (Down, Up, Left, Right)
- **Glow** intensity slider
- **BG Opacity** slider

### Ephapse
- matrixRainCellSize, matrixRainSpeed, matrixRainTrailLength, matrixRainColor, matrixRainBgOpacity, matrixRainGlowIntensity, matrixRainDirection, matrixRainThreshold, matrixRainSpacing

**Status**: Ephapse appears to have all the relevant controls already in the store. The UI panel needs to verify they're all exposed.

---

## 8. Dots Effect

### Grainrad Settings
- Spacing, Size sliders
- **Shape** dropdown
- **Grid Type** dropdown (Square Grid visible, possibly hexagonal)
- Invert checkbox

### Ephapse
- dotsSpacing, dotsSize, dotsShape, dotsGridType, dotsInvert, dotsColorMode, dotsForeground, dotsBackground

**Status**: Store has all fields. Verify UI exposes them all.

---

## 9. Pixel Sort Effect

### Grainrad Settings
- Threshold slider
- **Sort Mode** dropdown: Brightness, Hue, Saturation
- **Direction** dropdown: horizontal/vertical (+ possibly more)
- Streak Length, Intensity, Randomness, Reverse checkbox

### Ephapse
- pixelSortThreshold, pixelSortDirection, pixelSortMode, pixelSortStreakLength, pixelSortIntensity, pixelSortRandomness, pixelSortReverse

**Status**: Store has all fields. Verify UI exposes Sort Mode and Direction as labeled dropdowns.

---

## 10. Threshold Effect

### Grainrad Settings
- **Levels** slider (multi-level threshold, not just binary)
- **Dither** checkbox
- Foreground/Background color pickers

### Ephapse
- thresholdLevels, thresholdDither, thresholdPoint, thresholdInvert, thresholdForeground, thresholdBackground, thresholdPreserveColors

**Status**: Store has all fields. Grainrad's "Point" may just be the threshold value. Parity looks good.

---

## 11. Edge Detection Effect

### Grainrad Settings
- Algorithm dropdown: Sobel, Prewitt, Laplacian
- Threshold slider
- Line Width slider
- Invert checkbox, Color section

### Ephapse
- edgeAlgorithm (0/1/2 = Sobel/Prewitt/Laplacian), edgeThreshold, edgeLineWidth, edgeInvert, edgeColorMode, edgeColor, edgeBgColor

**Status**: Store has all fields. Parity looks good.

---

## 12. Wave Lines Effect

### Grainrad Settings
- Count, Amplitude, Frequency, Thickness sliders
- Direction dropdown
- **Animate** checkbox (with ⓘ info icon — animation requires video export)

### Ephapse
- waveLinesCount, waveLinesAmplitude, waveLinesFrequency, waveLinesThickness, waveLinesDirection, waveLinesColorMode, waveLinesAnimate

**Status**: Store has animate. Verify UI shows it with an explanatory note about video export.

---

## 13. Noise Field Effect

### Grainrad Settings
- Scale, Intensity, Speed, Octaves sliders
- **Noise Type** dropdown: Perlin, Simplex, Worley
- **Distort Only** checkbox
- **Animate** checkbox

### Ephapse
- noiseFieldScale, noiseFieldIntensity, noiseFieldSpeed, noiseFieldOctaves, noiseFieldType, noiseFieldDistortOnly, noiseFieldAnimate

**Status**: Store has all fields. Parity looks good.

---

## 14. Voronoi Effect

### Grainrad Settings
- Cell Size, Edge Width sliders
- **Edge Color** dropdown: Black, White, Darkened
- **Color Mode** dropdown: Cell Average, Center Sample, Gradient
- Randomize slider

### Ephapse
- voronoiCellSize, voronoiEdgeWidth, voronoiEdgeColor (0/1/2), voronoiColorMode (0/1/2), voronoiRandomize

**Status**: Store has all fields. Verify UI exposes Edge Color and Color Mode as labeled dropdowns (not just number sliders).

---

## 15. VHS Effect

### Grainrad Settings
- Distortion, Noise, Color Bleed, Scanlines, Tracking Error sliders

### Ephapse
- vhsDistortion, vhsNoise, vhsColorBleed, vhsScanlines, vhsTrackingError

**Status**: Full parity.

---

## 16. Contour Effect

### Grainrad Settings
- Levels, Line Thickness sliders
- Fill Mode, Color Mode dropdowns
- Color section

### Ephapse
- contourLevels, contourLineThickness, contourFillMode, contourColorMode, contourInvert, contourLineColor, contourBgColor

**Status**: Full parity.

---

## 17. Blockify, Crosshatch

Both appear to be in parity with ephapse's store fields. (No major gaps visible in screenshots.)

---

## 18. Processing Section (Pre-Processing)

### Grainrad
The **Processing** section is a shared panel visible for every effect:
- **Invert** checkbox
- **Brightness Map** slider (1.0 default) — adjusts luminance curve
- **Edge Enhance** slider (0 default)
- **Blur** slider (0.0 default) — pre-process blur applied before the effect
- **Quantize Colors** slider (0 default)
- **Shape Matching** slider (0.0 default)

### Ephapse
Ephapse has most of these in the **Advanced** settings section:
- `edgeEnhance: number`
- `quantizeColors: number`
- `spatialWeight: number`
- `brightnessWeight: number`
- `matchQuality: 'fast' | 'balanced' | 'quality'`

And in the **Image** section:
- `blur: number`

**Gaps**:
- No **Brightness Map** slider (separate from brightness; it adjusts the luminance response curve)
- No **Invert** in the Processing section — ephapse has `invert` only in CharacterSettings (ASCII-specific)
- Grainrad's Processing controls apply to all effects uniformly. In ephapse, Advanced settings seem to be ASCII-specific.
- Missing **Shape Matching** as a general pre-processing tool (it exists in AdvancedSettings but may only apply to ASCII matching)

---

## 19. Post-Processing

### Grainrad
- Bloom (checkbox only, no sub-settings visible)
- **Grain** (ON by default! Intensity: 35, Size: 2, Speed: 50)
- Chromatic (checkbox only)
- Scanlines (checkbox only)
- Vignette (checkbox only)
- CRT Curve (checkbox only)
- Phosphor (checkbox only)

### Ephapse
- All 7 stages with sub-sliders for each
- **Grain is OFF by default** (`enabled: false, intensity: 20, size: 1, speed: 1`)

**Gaps**:
- **Grain should be ON by default** (intensity ~20-35, size 1-2, speed 1-50). This is the most noticeable first-impression difference — grainrad has a film grain texture visible immediately.
- Grainrad's post-processing toggles appear simpler (just enable/disable without always-visible sub-sliders). This is a UX/layout difference.

---

## 20. Export

### Grainrad
7 formats in a grid layout (with format + extension label):
| PNG | JPEG |
| GIF | Video (.mp4) |
| SVG | Text (.txt) |
| Three.js (.html) | |

Plus: "High quality image" toggle + Export button

### Ephapse
- PNG only (static effects)
- Video (animated effects only)

**Gaps (by priority)**:
1. **JPEG export** — simple addition
2. **GIF export** — animated GIF, complex (requires frame encoding)
3. **SVG export** — vector export, significant for ASCII (character cells as SVG text elements)
4. **Text (.txt) export** — plain text dump of ASCII art, very useful for ASCII effect
5. **Three.js (.html) export** — ASCII only, generates a 3D scene in HTML. Unique/impressive feature.

---

## 21. Presets

### Grainrad
- **6 built-in presets**: Classic Terminal, Matrix, Retro CRT, High Detail, Minimal, Cyberpunk
- User can save additional custom presets
- **Export presets** button (JSON download)
- **Import presets** button (JSON upload)
- Each preset shows as a clickable card

### Ephapse
- User-created presets only (no built-ins)
- No export/import

**Gaps**:
1. No built-in presets — add Classic Terminal, Matrix, Retro CRT, High Detail, Minimal, Cyberpunk
2. No preset export/import (JSON serialization)

---

## 22. Themes

### Grainrad
4 themes accessible via a theme button:
- **Default** — dark background, green/white accent
- **vt320** — amber/orange terminal aesthetic
- **cassette** — green phosphor with dashed styling
- **coldwar** — green phosphor, ALL CAPS UI text

### Ephapse
- Only `'dark' | 'light'` toggle

**Gaps**: 3 additional terminal-aesthetic themes (vt320, cassette, coldwar).

---

## 23. Character Set / Color Mode

### Character Set (Grainrad)
Dropdown with 10 named presets. The actual character string for each is not exposed — grainrad uses predefined sets:
- STANDARD (` .:-=+*#%@`)
- BLOCKS (block drawing characters)
- BINARY (`01`)
- DETAILED (large dense charset)
- MINIMAL (just space + one char)
- ALPHABETIC
- NUMERIC
- MATH
- SYMBOLS
- CUSTOM (free-text entry)

### Color Mode (Grainrad)
Only 2 options per-effect: **Mono** and **Original**
- Mono: uses Foreground and Background color pickers
- Original: uses source image colors

### Ephapse
- 5 color modes: 'color' | 'grayscale' | 'monochrome' | 'sepia' | 'original'
- Free-text charset string

**Assessment**: Grainrad's approach is simpler and more user-friendly. The named charset dropdown is better UX than a raw text string. The Mono/Original binary is cleaner than 5 overlapping modes.

---

## 24. General UX Differences

- **Reset button** top-right of Settings panel — resets current effect's settings
- **Follow / About / Changelog** links in bottom of left sidebar
- **Changelog** modal with version history
- **[WEBGL2]** fallback indicator shown in header when WebGPU unavailable
- The Export section is in the right sidebar (inline), not a modal. Ephapse uses a modal.
- Zoom: `- 100% +` controls in bottom bar + "Reset 100%" button

---

## Priority Summary

### High Impact (visible/functional gaps)
1. **Dithering algorithms** — add Floyd-Steinberg, Atkinson, and other error diffusion algorithms (currently only Bayer variants)
2. **Dithering: Chromatic Effects** — per-channel RGB displacement (Red/Green/Blue channel offset + Max Displace)
3. **Grain ON by default** — change `defaultPostProcessingSettings.grain.enabled` to `true`
4. **Built-in presets** — add 6 predefined named presets
5. **Text (.txt) export** — ASCII art text dump
6. **JPEG export** — trivial canvas.toDataURL('image/jpeg')

### Medium Impact (UX improvements)
7. **Character Set presets dropdown** — named presets instead of/in addition to free text
8. **Preset import/export** (JSON)
9. **Output Width control** for ASCII (force column count)
10. **Per-effect Adjustments** — currently global; grainrad stores adjustments per-effect

### Lower Impact (polish/extras)
11. **SVG export** (complex)
12. **GIF export** (complex)
13. **Three.js export** (very complex, ASCII-only)
14. **Additional themes** (vt320, cassette, coldwar)
15. **GLB 3D model input**
16. **Brightness Map** pre-processing slider
17. **Modulation** checkbox for Dithering

---

## Screenshots Reference

| File | What it Shows |
|------|---------------|
| grainrad-01-initial.png | Initial page load, full UI |
| grainrad-02-fullview.png | Full page with all panels visible |
| grainrad-03-processing.png | Right sidebar: ASCII Settings + Processing section |
| grainrad-04-postprocessing.png | Post-Processing section |
| grainrad-05-postprocessing-scroll.png | Post-Processing continued |
| grainrad-06-export.png | Export section with all 7 format buttons |
| grainrad-07-color-mode-dropdown.png | Color Mode dropdown (Mono / Original) |
| grainrad-08-charset-dropdown.png | Character Set dropdown (10 presets) |
| grainrad-09-dithering.png | Dithering settings with Chromatic Effects panel |
| grainrad-10-dithering-algorithms.png | Dithering Algorithm dropdown (partial list) |
| grainrad-11-halftone.png | Halftone settings |
| grainrad-12-matrixrain.png | Matrix Rain settings |
| grainrad-13-dots.png | Dots settings |
| grainrad-14-contour.png | Contour settings |
| grainrad-15-pixelsort.png | Pixel Sort settings |
| grainrad-16-blockify.png | Blockify settings |
| grainrad-17-threshold.png | Threshold settings |
| grainrad-18-edgedetection.png | Edge Detection settings |
| grainrad-19-crosshatch.png | Crosshatch settings |
| grainrad-20-wavelines.png | Wave Lines settings |
| grainrad-21-noisefield.png | Noise Field settings |
| grainrad-22-voronoi.png | Voronoi settings |
| grainrad-23-vhs.png | VHS settings |
| grainrad-24-changelog.png | Changelog modal |
| grainrad-25-theme-vt320.png | vt320 amber theme |
| grainrad-26-theme-cassette.png | cassette green phosphor theme |
| grainrad-27-theme-coldwar.png | coldwar green ALL CAPS theme |
| grainrad-28-ascii-loaded.png | ASCII effect with test image loaded |
| grainrad-effect-*.png | Per-effect renders with test-face.png |
| grainrad-presets.png | Presets panel with 6 built-ins |
| grainrad-preset-classic-terminal.png | Classic Terminal preset applied |
