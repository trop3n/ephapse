import { ChevronDown, ChevronRight, RotateCcw, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';

function Section({ 
  title, 
  expanded, 
  onToggle, 
  children 
}: { 
  title: string; 
  expanded: boolean; 
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <span className="text-sm font-medium">{title}</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="p-3 pt-0 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Slider({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange,
  suffix = ''
}: { 
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--text-secondary)]">{label}</label>
        <span className="text-xs font-mono">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function SettingsPanel() {
  // Use individual selectors to prevent object creation
  const panelsSettings = useAppStore((state) => state.panels.settings);
  const settingsSectionsCharacter = useAppStore((state) => state.settingsSections.character);
  const settingsSectionsImage = useAppStore((state) => state.settingsSections.image);
  const settingsSectionsColor = useAppStore((state) => state.settingsSections.color);
  const settingsSectionsAdvanced = useAppStore((state) => state.settingsSections.advanced);
  const settingsSectionsPostProcessing = useAppStore((state) => state.settingsSections.postProcessing);
  
  const characterCellSize = useAppStore((state) => state.character.cellSize);
  const characterSpacing = useAppStore((state) => state.character.spacing);
  const characterBrightnessMapping = useAppStore((state) => state.character.brightnessMapping);
  const characterInvert = useAppStore((state) => state.character.invert);
  
  const imageBrightness = useAppStore((state) => state.image.brightness);
  const imageContrast = useAppStore((state) => state.image.contrast);
  const imageGamma = useAppStore((state) => state.image.gamma);
  const imageSaturation = useAppStore((state) => state.image.saturation);
  const imageHue = useAppStore((state) => state.image.hue);
  const imageSharpness = useAppStore((state) => state.image.sharpness);
  const imageBlur = useAppStore((state) => state.image.blur);
  
  const colorMode = useAppStore((state) => state.color.mode);
  const colorUseOriginalColors = useAppStore((state) => state.color.useOriginalColors);
  
  const advancedEdgeEnhance = useAppStore((state) => state.advanced.edgeEnhance);
  const advancedQuantizeColors = useAppStore((state) => state.advanced.quantizeColors);
  const advancedBrightnessWeight = useAppStore((state) => state.advanced.brightnessWeight);
  const advancedMatchQuality = useAppStore((state) => state.advanced.matchQuality);
  
  const postProcessingBloomEnabled = useAppStore((state) => state.postProcessing.bloom.enabled);
  const postProcessingBloomIntensity = useAppStore((state) => state.postProcessing.bloom.intensity);
  const postProcessingGrainEnabled = useAppStore((state) => state.postProcessing.grain.enabled);
  const postProcessingGrainIntensity = useAppStore((state) => state.postProcessing.grain.intensity);
  const postProcessingGrainSize = useAppStore((state) => state.postProcessing.grain.size);
  const postProcessingGrainSpeed = useAppStore((state) => state.postProcessing.grain.speed);
  const postProcessingChromaticEnabled = useAppStore((state) => state.postProcessing.chromatic.enabled);
  const postProcessingChromaticOffset = useAppStore((state) => state.postProcessing.chromatic.offset);
  const postProcessingScanlinesEnabled = useAppStore((state) => state.postProcessing.scanlines.enabled);
  const postProcessingScanlinesOpacity = useAppStore((state) => state.postProcessing.scanlines.opacity);
  const postProcessingScanlinesSpacing = useAppStore((state) => state.postProcessing.scanlines.spacing);
  const postProcessingVignetteEnabled = useAppStore((state) => state.postProcessing.vignette.enabled);
  const postProcessingVignetteIntensity = useAppStore((state) => state.postProcessing.vignette.intensity);
  const postProcessingVignetteRadius = useAppStore((state) => state.postProcessing.vignette.radius);
  const postProcessingCrtEnabled = useAppStore((state) => state.postProcessing.crtCurve.enabled);
  const postProcessingCrtAmount = useAppStore((state) => state.postProcessing.crtCurve.amount);
  const postProcessingPhosphorEnabled = useAppStore((state) => state.postProcessing.phosphor.enabled);
  const postProcessingPhosphorColor = useAppStore((state) => state.postProcessing.phosphor.color);
  
  const activeEffect = useAppStore((state) => state.activeEffect);
  
  const effectBlockifySize = useAppStore((state) => state.effectSettings.blockifySize);
  const effectBlockifyStyle = useAppStore((state) => state.effectSettings.blockifyStyle);
  const effectBlockifyBorderWidth = useAppStore((state) => state.effectSettings.blockifyBorderWidth);
  const effectBlockifyBorderColor = useAppStore((state) => state.effectSettings.blockifyBorderColor);
  const effectBlockifyGrayscale = useAppStore((state) => state.effectSettings.blockifyGrayscale);
  
  const effectThresholdLevels = useAppStore((state) => state.effectSettings.thresholdLevels);
  const effectThresholdDither = useAppStore((state) => state.effectSettings.thresholdDither);
  const effectThresholdPoint = useAppStore((state) => state.effectSettings.thresholdPoint);
  const effectThresholdInvert = useAppStore((state) => state.effectSettings.thresholdInvert);
  const effectThresholdPreserveColors = useAppStore((state) => state.effectSettings.thresholdPreserveColors);
  
  const effectHalftoneSpacing = useAppStore((state) => state.effectSettings.halftoneSpacing);
  const effectHalftoneAngle = useAppStore((state) => state.effectSettings.halftoneAngle);
  const effectHalftoneShape = useAppStore((state) => state.effectSettings.halftoneShape);
  const effectHalftoneInvert = useAppStore((state) => state.effectSettings.halftoneInvert);
  const effectHalftoneColorMode = useAppStore((state) => state.effectSettings.halftoneColorMode);
  
  const effectDotsSpacing = useAppStore((state) => state.effectSettings.dotsSpacing);
  const effectDotsSize = useAppStore((state) => state.effectSettings.dotsSize);
  const effectDotsShape = useAppStore((state) => state.effectSettings.dotsShape);
  const effectDotsGridType = useAppStore((state) => state.effectSettings.dotsGridType);
  const effectDotsInvert = useAppStore((state) => state.effectSettings.dotsInvert);
  const effectDotsColorMode = useAppStore((state) => state.effectSettings.dotsColorMode);
  
  const effectEdgeThreshold = useAppStore((state) => state.effectSettings.edgeThreshold);
  const effectEdgeLineWidth = useAppStore((state) => state.effectSettings.edgeLineWidth);
  const effectEdgeAlgorithm = useAppStore((state) => state.effectSettings.edgeAlgorithm);
  const effectEdgeInvert = useAppStore((state) => state.effectSettings.edgeInvert);
  const effectEdgeColorMode = useAppStore((state) => state.effectSettings.edgeColorMode);
  
  const effectCrosshatchDensity = useAppStore((state) => state.effectSettings.crosshatchDensity);
  const effectCrosshatchAngle = useAppStore((state) => state.effectSettings.crosshatchAngle);
  const effectCrosshatchLayers = useAppStore((state) => state.effectSettings.crosshatchLayers);
  const effectCrosshatchLineWidth = useAppStore((state) => state.effectSettings.crosshatchLineWidth);
  const effectCrosshatchInvert = useAppStore((state) => state.effectSettings.crosshatchInvert);
  const effectCrosshatchRandomness = useAppStore((state) => state.effectSettings.crosshatchRandomness);
  
  const effectWaveLinesCount = useAppStore((state) => state.effectSettings.waveLinesCount);
  const effectWaveLinesAmplitude = useAppStore((state) => state.effectSettings.waveLinesAmplitude);
  const effectWaveLinesFrequency = useAppStore((state) => state.effectSettings.waveLinesFrequency);
  const effectWaveLinesThickness = useAppStore((state) => state.effectSettings.waveLinesThickness);
  const effectWaveLinesDirection = useAppStore((state) => state.effectSettings.waveLinesDirection);
  const effectWaveLinesColorMode = useAppStore((state) => state.effectSettings.waveLinesColorMode);
  const effectWaveLinesAnimate = useAppStore((state) => state.effectSettings.waveLinesAnimate);
  
  const effectNoiseFieldScale = useAppStore((state) => state.effectSettings.noiseFieldScale);
  const effectNoiseFieldIntensity = useAppStore((state) => state.effectSettings.noiseFieldIntensity);
  const effectNoiseFieldSpeed = useAppStore((state) => state.effectSettings.noiseFieldSpeed);
  const effectNoiseFieldOctaves = useAppStore((state) => state.effectSettings.noiseFieldOctaves);
  const effectNoiseFieldType = useAppStore((state) => state.effectSettings.noiseFieldType);
  const effectNoiseFieldDistortOnly = useAppStore((state) => state.effectSettings.noiseFieldDistortOnly);
  const effectNoiseFieldAnimate = useAppStore((state) => state.effectSettings.noiseFieldAnimate);
  
  const effectVhsDistortion = useAppStore((state) => state.effectSettings.vhsDistortion);
  const effectVhsNoise = useAppStore((state) => state.effectSettings.vhsNoise);
  const effectVhsColorBleed = useAppStore((state) => state.effectSettings.vhsColorBleed);
  const effectVhsScanlines = useAppStore((state) => state.effectSettings.vhsScanlines);
  const effectVhsTrackingError = useAppStore((state) => state.effectSettings.vhsTrackingError);
  
  const effectPixelSortThreshold = useAppStore((state) => state.effectSettings.pixelSortThreshold);
  const effectPixelSortDirection = useAppStore((state) => state.effectSettings.pixelSortDirection);
  const effectPixelSortMode = useAppStore((state) => state.effectSettings.pixelSortMode);
  const effectPixelSortStreakLength = useAppStore((state) => state.effectSettings.pixelSortStreakLength);
  const effectPixelSortIntensity = useAppStore((state) => state.effectSettings.pixelSortIntensity);
  const effectPixelSortRandomness = useAppStore((state) => state.effectSettings.pixelSortRandomness);
  const effectPixelSortReverse = useAppStore((state) => state.effectSettings.pixelSortReverse);
  
  const effectBlurRadius = useAppStore((state) => state.effectSettings.blurRadius);
  
  const effectContourLevels = useAppStore((state) => state.effectSettings.contourLevels);
  const effectContourLineThickness = useAppStore((state) => state.effectSettings.contourLineThickness);
  const effectContourFillMode = useAppStore((state) => state.effectSettings.contourFillMode);
  const effectContourColorMode = useAppStore((state) => state.effectSettings.contourColorMode);
  const effectContourInvert = useAppStore((state) => state.effectSettings.contourInvert);
  
  const effectVoronoiCellSize = useAppStore((state) => state.effectSettings.voronoiCellSize);
  const effectVoronoiEdgeWidth = useAppStore((state) => state.effectSettings.voronoiEdgeWidth);
  const effectVoronoiEdgeColor = useAppStore((state) => state.effectSettings.voronoiEdgeColor);
  const effectVoronoiColorMode = useAppStore((state) => state.effectSettings.voronoiColorMode);
  const effectVoronoiRandomize = useAppStore((state) => state.effectSettings.voronoiRandomize);
  
  const effectMatrixRainCellSize = useAppStore((state) => state.effectSettings.matrixRainCellSize);
  const effectMatrixRainSpeed = useAppStore((state) => state.effectSettings.matrixRainSpeed);
  const effectMatrixRainTrailLength = useAppStore((state) => state.effectSettings.matrixRainTrailLength);
  const effectMatrixRainColor = useAppStore((state) => state.effectSettings.matrixRainColor);
  const effectMatrixRainBgOpacity = useAppStore((state) => state.effectSettings.matrixRainBgOpacity);
  const effectMatrixRainGlowIntensity = useAppStore((state) => state.effectSettings.matrixRainGlowIntensity);
  const effectMatrixRainDirection = useAppStore((state) => state.effectSettings.matrixRainDirection);
  const effectMatrixRainThreshold = useAppStore((state) => state.effectSettings.matrixRainThreshold);
  const effectMatrixRainSpacing = useAppStore((state) => state.effectSettings.matrixRainSpacing);
  
  const effectDitheringMethod = useAppStore((state) => state.effectSettings.ditheringMethod);
  const effectDitheringColorLevels = useAppStore((state) => state.effectSettings.ditheringColorLevels);
  const effectDitheringMatrixSize = useAppStore((state) => state.effectSettings.ditheringMatrixSize);
  
  const togglePanel = useAppStore((state) => state.togglePanel);
  const toggleSettingsSection = useAppStore((state) => state.toggleSettingsSection);
  const updateCharacter = useAppStore((state) => state.updateCharacter);
  const updateImage = useAppStore((state) => state.updateImage);
  const updateColor = useAppStore((state) => state.updateColor);
  const updateAdvanced = useAppStore((state) => state.updateAdvanced);
  const updatePostProcessing = useAppStore((state) => state.updatePostProcessing);
  const updateEffectSettings = useAppStore((state) => state.updateEffectSettings);
  const resetSettings = useAppStore((state) => state.resetSettings);

  if (!panelsSettings) return null;

  return (
    <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border)] flex flex-col shrink-0">
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border)]">
        <span className="text-sm font-medium">Settings</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={resetSettings}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)]"
            title="Reset all settings"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => togglePanel('settings')}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Blockify Settings - only show when active */}
        {activeEffect === 'blockify' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Blockify Settings</h3>
            <Slider
              label="Block Size"
              value={effectBlockifySize}
              min={2}
              max={64}
              onChange={(v) => updateEffectSettings({ blockifySize: v })}
              suffix="px"
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Style</label>
              <select
                value={effectBlockifyStyle}
                onChange={(e) => updateEffectSettings({ blockifyStyle: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Full Blocks</option>
                <option value={1}>Shaded</option>
                <option value={2}>Outline</option>
              </select>
            </div>
            {effectBlockifyStyle === 2 && (
              <>
                <Slider
                  label="Border Width"
                  value={effectBlockifyBorderWidth}
                  min={1}
                  max={Math.floor(effectBlockifySize / 2) - 1 || 1}
                  onChange={(v) => updateEffectSettings({ blockifyBorderWidth: v })}
                  suffix="px"
                />
                <div>
                  <label className="text-xs text-[var(--text-secondary)] block mb-2">Border Color</label>
                  <input
                    type="color"
                    value={`#${Math.round(effectBlockifyBorderColor[0] * 255).toString(16).padStart(2, '0')}${Math.round(effectBlockifyBorderColor[1] * 255).toString(16).padStart(2, '0')}${Math.round(effectBlockifyBorderColor[2] * 255).toString(16).padStart(2, '0')}`}
                    onChange={(e) => {
                      const hex = e.target.value.slice(1);
                      const r = parseInt(hex.slice(0, 2), 16) / 255;
                      const g = parseInt(hex.slice(2, 4), 16) / 255;
                      const b = parseInt(hex.slice(4, 6), 16) / 255;
                      updateEffectSettings({ blockifyBorderColor: [r, g, b] });
                    }}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectBlockifyGrayscale}
                onChange={(e) => updateEffectSettings({ blockifyGrayscale: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Grayscale</span>
            </label>
          </div>
        )}

        {/* Threshold Settings - only show when active */}
        {activeEffect === 'threshold' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Threshold Settings</h3>
            <Slider
              label="Levels"
              value={effectThresholdLevels}
              min={2}
              max={8}
              onChange={(v) => updateEffectSettings({ thresholdLevels: v })}
            />
            {effectThresholdLevels === 2 && (
              <Slider
                label="Threshold Point"
                value={effectThresholdPoint}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => updateEffectSettings({ thresholdPoint: v })}
              />
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectThresholdDither}
                onChange={(e) => updateEffectSettings({ thresholdDither: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Dither</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectThresholdInvert}
                onChange={(e) => updateEffectSettings({ thresholdInvert: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Invert</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectThresholdPreserveColors}
                onChange={(e) => updateEffectSettings({ thresholdPreserveColors: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Preserve Colors</span>
            </label>
          </div>
        )}

        {/* Halftone Settings - only show when active */}
        {activeEffect === 'halftone' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Halftone Settings</h3>
            <Slider
              label="Dot Spacing"
              value={effectHalftoneSpacing}
              min={3}
              max={20}
              onChange={(v) => updateEffectSettings({ halftoneSpacing: v })}
              suffix="px"
            />
            <Slider
              label="Angle"
              value={effectHalftoneAngle}
              min={0}
              max={90}
              onChange={(v) => updateEffectSettings({ halftoneAngle: v })}
              suffix="°"
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Shape</label>
              <select
                value={effectHalftoneShape}
                onChange={(e) => updateEffectSettings({ halftoneShape: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Circle</option>
                <option value={1}>Square</option>
                <option value={2}>Diamond</option>
                <option value={3}>Line</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectHalftoneInvert}
                onChange={(e) => updateEffectSettings({ halftoneInvert: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Invert</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectHalftoneColorMode}
                onChange={(e) => updateEffectSettings({ halftoneColorMode: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Use Original Colors</span>
            </label>
          </div>
        )}

        {/* Dots Settings - only show when active */}
        {activeEffect === 'dots' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Dots Settings</h3>
            <Slider
              label="Spacing"
              value={effectDotsSpacing}
              min={0.5}
              max={3}
              step={0.25}
              onChange={(v) => updateEffectSettings({ dotsSpacing: v })}
            />
            <Slider
              label="Dot Size"
              value={effectDotsSize}
              min={0.5}
              max={2}
              step={0.1}
              onChange={(v) => updateEffectSettings({ dotsSize: v })}
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Shape</label>
              <select
                value={effectDotsShape}
                onChange={(e) => updateEffectSettings({ dotsShape: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Circle</option>
                <option value={1}>Square</option>
                <option value={2}>Diamond</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Grid Type</label>
              <select
                value={effectDotsGridType}
                onChange={(e) => updateEffectSettings({ dotsGridType: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Square</option>
                <option value={1}>Hexagonal</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectDotsInvert}
                onChange={(e) => updateEffectSettings({ dotsInvert: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Invert</span>
            </label>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Color Mode</label>
              <select
                value={effectDotsColorMode}
                onChange={(e) => updateEffectSettings({ dotsColorMode: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Original Colors</option>
                <option value={1}>Grayscale</option>
                <option value={2}>Custom</option>
              </select>
            </div>
          </div>
        )}

        {/* Edge Detection Settings - only show when active */}
        {activeEffect === 'edgeDetection' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Edge Detection Settings</h3>
            <Slider
              label="Threshold"
              value={effectEdgeThreshold}
              min={0.05}
              max={0.5}
              step={0.01}
              onChange={(v) => updateEffectSettings({ edgeThreshold: v })}
            />
            <Slider
              label="Line Width"
              value={effectEdgeLineWidth}
              min={0.5}
              max={4}
              step={0.5}
              onChange={(v) => updateEffectSettings({ edgeLineWidth: v })}
              suffix="px"
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Algorithm</label>
              <select
                value={effectEdgeAlgorithm}
                onChange={(e) => updateEffectSettings({ edgeAlgorithm: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Sobel</option>
                <option value={1}>Prewitt</option>
                <option value={2}>Laplacian</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectEdgeInvert}
                onChange={(e) => updateEffectSettings({ edgeInvert: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Invert</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectEdgeColorMode}
                onChange={(e) => updateEffectSettings({ edgeColorMode: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Use Original Colors</span>
            </label>
          </div>
        )}

        {/* Crosshatch Settings - only show when active */}
        {activeEffect === 'crosshatch' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Crosshatch Settings</h3>
            <Slider
              label="Density"
              value={effectCrosshatchDensity}
              min={3}
              max={12}
              onChange={(v) => updateEffectSettings({ crosshatchDensity: v })}
            />
            <Slider
              label="Angle"
              value={effectCrosshatchAngle}
              min={0}
              max={90}
              onChange={(v) => updateEffectSettings({ crosshatchAngle: v })}
              suffix="°"
            />
            <Slider
              label="Layers"
              value={effectCrosshatchLayers}
              min={1}
              max={4}
              onChange={(v) => updateEffectSettings({ crosshatchLayers: v })}
            />
            <Slider
              label="Line Width"
              value={effectCrosshatchLineWidth}
              min={0.05}
              max={0.3}
              step={0.01}
              onChange={(v) => updateEffectSettings({ crosshatchLineWidth: v })}
            />
            <Slider
              label="Randomness"
              value={effectCrosshatchRandomness}
              min={0}
              max={1}
              step={0.1}
              onChange={(v) => updateEffectSettings({ crosshatchRandomness: v })}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectCrosshatchInvert}
                onChange={(e) => updateEffectSettings({ crosshatchInvert: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Invert</span>
            </label>
          </div>
        )}

        {/* Wave Lines Settings - only show when active */}
        {activeEffect === 'waveLines' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Wave Lines Settings</h3>
            <Slider
              label="Line Count"
              value={effectWaveLinesCount}
              min={10}
              max={150}
              onChange={(v) => updateEffectSettings({ waveLinesCount: v })}
            />
            <Slider
              label="Amplitude"
              value={effectWaveLinesAmplitude}
              min={1}
              max={50}
              onChange={(v) => updateEffectSettings({ waveLinesAmplitude: v })}
              suffix="px"
            />
            <Slider
              label="Frequency"
              value={effectWaveLinesFrequency}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => updateEffectSettings({ waveLinesFrequency: v })}
            />
            <Slider
              label="Line Thickness"
              value={effectWaveLinesThickness}
              min={0.2}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ waveLinesThickness: v })}
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Direction</label>
              <select
                value={effectWaveLinesDirection}
                onChange={(e) => updateEffectSettings({ waveLinesDirection: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Horizontal</option>
                <option value={1}>Vertical</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Color Mode</label>
              <select
                value={effectWaveLinesColorMode}
                onChange={(e) => updateEffectSettings({ waveLinesColorMode: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Original Colors</option>
                <option value={1}>Grayscale</option>
                <option value={2}>Custom</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectWaveLinesAnimate}
                onChange={(e) => updateEffectSettings({ waveLinesAnimate: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Animate</span>
            </label>
          </div>
        )}

        {/* Noise Field Settings - only show when active */}
        {activeEffect === 'noiseField' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Noise Field Settings</h3>
            <Slider
              label="Scale"
              value={effectNoiseFieldScale}
              min={10}
              max={100}
              onChange={(v) => updateEffectSettings({ noiseFieldScale: v })}
            />
            <Slider
              label="Intensity"
              value={effectNoiseFieldIntensity}
              min={0.5}
              max={3}
              step={0.1}
              onChange={(v) => updateEffectSettings({ noiseFieldIntensity: v })}
            />
            <Slider
              label="Speed"
              value={effectNoiseFieldSpeed}
              min={0.1}
              max={3}
              step={0.1}
              onChange={(v) => updateEffectSettings({ noiseFieldSpeed: v })}
            />
            <Slider
              label="Octaves"
              value={effectNoiseFieldOctaves}
              min={1}
              max={6}
              onChange={(v) => updateEffectSettings({ noiseFieldOctaves: v })}
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Noise Type</label>
              <select
                value={effectNoiseFieldType}
                onChange={(e) => updateEffectSettings({ noiseFieldType: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Perlin</option>
                <option value={1}>Simplex</option>
                <option value={2}>Worley</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectNoiseFieldDistortOnly}
                onChange={(e) => updateEffectSettings({ noiseFieldDistortOnly: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Distort Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectNoiseFieldAnimate}
                onChange={(e) => updateEffectSettings({ noiseFieldAnimate: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Animate</span>
            </label>
          </div>
        )}

        {/* VHS Settings - only show when active */}
        {activeEffect === 'vhs' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">VHS Settings</h3>
            <Slider
              label="Distortion"
              value={effectVhsDistortion}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ vhsDistortion: v })}
            />
            <Slider
              label="Noise"
              value={effectVhsNoise}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ vhsNoise: v })}
            />
            <Slider
              label="Color Bleed"
              value={effectVhsColorBleed}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ vhsColorBleed: v })}
            />
            <Slider
              label="Scanlines"
              value={effectVhsScanlines}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ vhsScanlines: v })}
            />
            <Slider
              label="Tracking Error"
              value={effectVhsTrackingError}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ vhsTrackingError: v })}
            />
          </div>
        )}

        {/* Pixel Sort Settings - only show when active */}
        {activeEffect === 'pixelSort' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Pixel Sort Settings</h3>
            <Slider
              label="Threshold"
              value={effectPixelSortThreshold}
              min={0.1}
              max={0.9}
              step={0.05}
              onChange={(v) => updateEffectSettings({ pixelSortThreshold: v })}
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Direction</label>
              <select
                value={effectPixelSortDirection}
                onChange={(e) => updateEffectSettings({ pixelSortDirection: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Horizontal</option>
                <option value={1}>Vertical</option>
                <option value={2}>Diagonal</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Mode</label>
              <select
                value={effectPixelSortMode}
                onChange={(e) => updateEffectSettings({ pixelSortMode: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Black</option>
                <option value={1}>White</option>
                <option value={2}>Bright</option>
                <option value={3}>Dark</option>
              </select>
            </div>
            <Slider
              label="Streak Length"
              value={effectPixelSortStreakLength}
              min={10}
              max={100}
              onChange={(v) => updateEffectSettings({ pixelSortStreakLength: v })}
              suffix="px"
            />
            <Slider
              label="Intensity"
              value={effectPixelSortIntensity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ pixelSortIntensity: v })}
            />
            <Slider
              label="Randomness"
              value={effectPixelSortRandomness}
              min={0}
              max={1}
              step={0.1}
              onChange={(v) => updateEffectSettings({ pixelSortRandomness: v })}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectPixelSortReverse}
                onChange={(e) => updateEffectSettings({ pixelSortReverse: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Reverse Sort</span>
            </label>
          </div>
        )}

        {/* Blur Settings - only show when active */}
        {activeEffect === 'blur' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Blur Settings</h3>
            <Slider
              label="Radius"
              value={effectBlurRadius}
              min={1}
              max={30}
              onChange={(v) => updateEffectSettings({ blurRadius: v })}
              suffix="px"
            />
          </div>
        )}

        {/* Contour Settings - only show when active */}
        {activeEffect === 'contour' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Contour Settings</h3>
            <Slider
              label="Levels"
              value={effectContourLevels}
              min={2}
              max={20}
              onChange={(v) => updateEffectSettings({ contourLevels: v })}
            />
            <Slider
              label="Line Thickness"
              value={effectContourLineThickness}
              min={0.5}
              max={5}
              step={0.5}
              onChange={(v) => updateEffectSettings({ contourLineThickness: v })}
              suffix="px"
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Fill Mode</label>
              <select
                value={effectContourFillMode}
                onChange={(e) => updateEffectSettings({ contourFillMode: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Filled Bands</option>
                <option value={1}>Lines Only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Color Mode</label>
              <select
                value={effectContourColorMode}
                onChange={(e) => updateEffectSettings({ contourColorMode: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Grayscale</option>
                <option value={1}>Original Colors</option>
                <option value={2}>Custom</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectContourInvert}
                onChange={(e) => updateEffectSettings({ contourInvert: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Invert</span>
            </label>
          </div>
        )}

        {/* Voronoi Settings - only show when active */}
        {activeEffect === 'voronoi' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Voronoi Settings</h3>
            <Slider
              label="Cell Size"
              value={effectVoronoiCellSize}
              min={10}
              max={100}
              onChange={(v) => updateEffectSettings({ voronoiCellSize: v })}
              suffix="px"
            />
            <Slider
              label="Edge Width"
              value={effectVoronoiEdgeWidth}
              min={0}
              max={2}
              step={0.1}
              onChange={(v) => updateEffectSettings({ voronoiEdgeWidth: v })}
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Edge Color</label>
              <select
                value={effectVoronoiEdgeColor}
                onChange={(e) => updateEffectSettings({ voronoiEdgeColor: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Black</option>
                <option value={1}>White</option>
                <option value={2}>Darkened Cell</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Color Mode</label>
              <select
                value={effectVoronoiColorMode}
                onChange={(e) => updateEffectSettings({ voronoiColorMode: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Cell Average</option>
                <option value={1}>Center Sample</option>
                <option value={2}>Gradient</option>
              </select>
            </div>
            <Slider
              label="Randomize"
              value={effectVoronoiRandomize}
              min={0}
              max={1}
              step={0.1}
              onChange={(v) => updateEffectSettings({ voronoiRandomize: v })}
            />
          </div>
        )}

        {/* Matrix Rain Settings - only show when active */}
        {activeEffect === 'matrixRain' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Matrix Rain Settings</h3>
            <Slider
              label="Cell Size"
              value={effectMatrixRainCellSize}
              min={4}
              max={32}
              onChange={(v) => updateEffectSettings({ matrixRainCellSize: v })}
              suffix="px"
            />
            <Slider
              label="Speed"
              value={effectMatrixRainSpeed}
              min={0.5}
              max={3}
              step={0.1}
              onChange={(v) => updateEffectSettings({ matrixRainSpeed: v })}
            />
            <Slider
              label="Trail Length"
              value={effectMatrixRainTrailLength}
              min={5}
              max={30}
              onChange={(v) => updateEffectSettings({ matrixRainTrailLength: v })}
            />
            <Slider
              label="Background Opacity"
              value={effectMatrixRainBgOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateEffectSettings({ matrixRainBgOpacity: v })}
            />
            <Slider
              label="Glow Intensity"
              value={effectMatrixRainGlowIntensity}
              min={0}
              max={2}
              step={0.1}
              onChange={(v) => updateEffectSettings({ matrixRainGlowIntensity: v })}
            />
            <Slider
              label="Threshold"
              value={effectMatrixRainThreshold}
              min={0}
              max={0.5}
              step={0.05}
              onChange={(v) => updateEffectSettings({ matrixRainThreshold: v })}
            />
            <Slider
              label="Spacing"
              value={effectMatrixRainSpacing}
              min={0}
              max={0.5}
              step={0.05}
              onChange={(v) => updateEffectSettings({ matrixRainSpacing: v })}
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Direction</label>
              <select
                value={effectMatrixRainDirection}
                onChange={(e) => updateEffectSettings({ matrixRainDirection: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Down</option>
                <option value={1}>Up</option>
                <option value={2}>Left</option>
                <option value={3}>Right</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Rain Color</label>
              <input
                type="color"
                value={`#${Math.round(effectMatrixRainColor[0] * 255).toString(16).padStart(2, '0')}${Math.round(effectMatrixRainColor[1] * 255).toString(16).padStart(2, '0')}${Math.round(effectMatrixRainColor[2] * 255).toString(16).padStart(2, '0')}`}
                onChange={(e) => {
                  const hex = e.target.value.slice(1);
                  const r = parseInt(hex.slice(0, 2), 16) / 255;
                  const g = parseInt(hex.slice(2, 4), 16) / 255;
                  const b = parseInt(hex.slice(4, 6), 16) / 255;
                  updateEffectSettings({ matrixRainColor: [r, g, b] });
                }}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Dithering Settings - only show when active */}
        {activeEffect === 'dithering' && (
          <div className="border-b border-[var(--border)] p-3 space-y-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Dithering Settings</h3>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Method</label>
              <select
                value={effectDitheringMethod}
                onChange={(e) => updateEffectSettings({ ditheringMethod: Number(e.target.value) })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value={0}>Bayer 2x2</option>
                <option value={1}>Bayer 4x4</option>
                <option value={2}>Bayer 8x8</option>
                <option value={3}>None (Posterize)</option>
              </select>
            </div>
            <Slider
              label="Color Levels"
              value={effectDitheringColorLevels}
              min={2}
              max={16}
              onChange={(v) => updateEffectSettings({ ditheringColorLevels: v })}
            />
            <Slider
              label="Matrix Size"
              value={effectDitheringMatrixSize}
              min={2}
              max={8}
              step={2}
              onChange={(v) => updateEffectSettings({ ditheringMatrixSize: v })}
            />
          </div>
        )}

        {/* Character Settings */}
        <Section
          title="Character"
          expanded={settingsSectionsCharacter}
          onToggle={() => toggleSettingsSection('character')}
        >
          <div className="space-y-4">
            <Slider
              label="Cell Size"
              value={characterCellSize}
              min={4}
              max={32}
              onChange={(v) => updateCharacter({ cellSize: v })}
            />
            <Slider
              label="Spacing"
              value={characterSpacing}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateCharacter({ spacing: v })}
            />
            <Slider
              label="Brightness Mapping"
              value={characterBrightnessMapping}
              min={0.1}
              max={2}
              step={0.1}
              onChange={(v) => updateCharacter({ brightnessMapping: v })}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={characterInvert}
                onChange={(e) => updateCharacter({ invert: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Invert</span>
            </label>
          </div>
        </Section>

        {/* Image Settings */}
        <Section
          title="Image Processing"
          expanded={settingsSectionsImage}
          onToggle={() => toggleSettingsSection('image')}
        >
          <div className="space-y-4">
            <Slider
              label="Brightness"
              value={imageBrightness}
              min={-100}
              max={100}
              onChange={(v) => updateImage({ brightness: v })}
            />
            <Slider
              label="Contrast"
              value={imageContrast}
              min={-100}
              max={100}
              onChange={(v) => updateImage({ contrast: v })}
            />
            <Slider
              label="Gamma"
              value={imageGamma}
              min={0.1}
              max={3}
              step={0.1}
              onChange={(v) => updateImage({ gamma: v })}
            />
            <Slider
              label="Saturation"
              value={imageSaturation}
              min={-100}
              max={100}
              onChange={(v) => updateImage({ saturation: v })}
            />
            <Slider
              label="Hue"
              value={imageHue}
              min={0}
              max={360}
              onChange={(v) => updateImage({ hue: v })}
            />
            <Slider
              label="Sharpness"
              value={imageSharpness}
              min={0}
              max={100}
              onChange={(v) => updateImage({ sharpness: v })}
            />
            <Slider
              label="Blur"
              value={imageBlur}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateImage({ blur: v })}
            />
          </div>
        </Section>

        {/* Color Settings */}
        <Section
          title="Color"
          expanded={settingsSectionsColor}
          onToggle={() => toggleSettingsSection('color')}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Color Mode</label>
              <select
                value={colorMode}
                onChange={(e) => updateColor({ mode: e.target.value as 'color' | 'grayscale' | 'monochrome' | 'sepia' | 'original' })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value="color">Full Color</option>
                <option value="grayscale">Grayscale</option>
                <option value="monochrome">Monochrome</option>
                <option value="sepia">Sepia</option>
                <option value="original">Original</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={colorUseOriginalColors}
                onChange={(e) => updateColor({ useOriginalColors: e.target.checked })}
                className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
              />
              <span className="text-sm">Use Original Colors</span>
            </label>
          </div>
        </Section>

        {/* Advanced Settings */}
        <Section
          title="Advanced"
          expanded={settingsSectionsAdvanced}
          onToggle={() => toggleSettingsSection('advanced')}
        >
          <div className="space-y-4">
            <Slider
              label="Edge Enhance"
              value={advancedEdgeEnhance}
              min={0}
              max={100}
              onChange={(v) => updateAdvanced({ edgeEnhance: v })}
            />
            <Slider
              label="Quantize Colors"
              value={advancedQuantizeColors}
              min={0}
              max={32}
              onChange={(v) => updateAdvanced({ quantizeColors: v })}
            />
            <Slider
              label="Pattern Matching"
              value={advancedBrightnessWeight}
              min={0}
              max={1}
              step={0.1}
              suffix=""
              onChange={(v) => updateAdvanced({ brightnessWeight: v })}
            />
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-2">Match Quality</label>
              <select
                value={advancedMatchQuality}
                onChange={(e) => updateAdvanced({ matchQuality: e.target.value as 'fast' | 'balanced' | 'quality' })}
                className="w-full p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                <option value="fast">Fast (2x2)</option>
                <option value="balanced">Balanced (3x3)</option>
                <option value="quality">Quality (4x4)</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Post-Processing */}
        <Section
          title="Post-Processing"
          expanded={settingsSectionsPostProcessing}
          onToggle={() => toggleSettingsSection('postProcessing')}
        >
          <div className="space-y-4">
            {/* Bloom */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postProcessingBloomEnabled}
                  onChange={(e) => updatePostProcessing({ bloom: { enabled: e.target.checked, intensity: postProcessingBloomIntensity } })}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">Bloom</span>
              </label>
              {postProcessingBloomEnabled && (
                <Slider
                  label="Intensity"
                  value={postProcessingBloomIntensity}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(v) => updatePostProcessing({ bloom: { enabled: true, intensity: v } })}
                />
              )}
            </div>

            {/* Grain */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postProcessingGrainEnabled}
                  onChange={(e) => updatePostProcessing({ grain: { enabled: e.target.checked, intensity: postProcessingGrainIntensity, size: postProcessingGrainSize, speed: postProcessingGrainSpeed } })}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">Film Grain</span>
              </label>
              {postProcessingGrainEnabled && (
                <>
                  <Slider
                    label="Intensity"
                    value={postProcessingGrainIntensity}
                    min={0}
                    max={100}
                    onChange={(v) => updatePostProcessing({ grain: { enabled: true, intensity: v, size: postProcessingGrainSize, speed: postProcessingGrainSpeed } })}
                  />
                  <Slider
                    label="Size"
                    value={postProcessingGrainSize}
                    min={0.5}
                    max={4}
                    step={0.5}
                    onChange={(v) => updatePostProcessing({ grain: { enabled: true, intensity: postProcessingGrainIntensity, size: v, speed: postProcessingGrainSpeed } })}
                  />
                  <Slider
                    label="Speed"
                    value={postProcessingGrainSpeed}
                    min={0}
                    max={5}
                    step={0.5}
                    onChange={(v) => updatePostProcessing({ grain: { enabled: true, intensity: postProcessingGrainIntensity, size: postProcessingGrainSize, speed: v } })}
                  />
                </>
              )}
            </div>

            {/* Chromatic Aberration */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postProcessingChromaticEnabled}
                  onChange={(e) => updatePostProcessing({ chromatic: { enabled: e.target.checked, offset: postProcessingChromaticOffset } })}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">Chromatic Aberration</span>
              </label>
              {postProcessingChromaticEnabled && (
                <Slider
                  label="Offset"
                  value={postProcessingChromaticOffset}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) => updatePostProcessing({ chromatic: { enabled: true, offset: v } })}
                />
              )}
            </div>

            {/* Scanlines */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postProcessingScanlinesEnabled}
                  onChange={(e) => updatePostProcessing({ scanlines: { enabled: e.target.checked, opacity: postProcessingScanlinesOpacity, spacing: postProcessingScanlinesSpacing } })}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">Scanlines</span>
              </label>
              {postProcessingScanlinesEnabled && (
                <>
                  <Slider
                    label="Opacity"
                    value={postProcessingScanlinesOpacity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => updatePostProcessing({ scanlines: { enabled: true, opacity: v, spacing: postProcessingScanlinesSpacing } })}
                  />
                  <Slider
                    label="Spacing"
                    value={postProcessingScanlinesSpacing}
                    min={1}
                    max={8}
                    step={1}
                    onChange={(v) => updatePostProcessing({ scanlines: { enabled: true, opacity: postProcessingScanlinesOpacity, spacing: v } })}
                  />
                </>
              )}
            </div>

            {/* Vignette */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postProcessingVignetteEnabled}
                  onChange={(e) => updatePostProcessing({ vignette: { enabled: e.target.checked, intensity: postProcessingVignetteIntensity, radius: postProcessingVignetteRadius } })}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">Vignette</span>
              </label>
              {postProcessingVignetteEnabled && (
                <>
                  <Slider
                    label="Intensity"
                    value={postProcessingVignetteIntensity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => updatePostProcessing({ vignette: { enabled: true, intensity: v, radius: postProcessingVignetteRadius } })}
                  />
                  <Slider
                    label="Radius"
                    value={postProcessingVignetteRadius}
                    min={0}
                    max={1.5}
                    step={0.05}
                    onChange={(v) => updatePostProcessing({ vignette: { enabled: true, intensity: postProcessingVignetteIntensity, radius: v } })}
                  />
                </>
              )}
            </div>

            {/* CRT */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postProcessingCrtEnabled}
                  onChange={(e) => updatePostProcessing({ crtCurve: { enabled: e.target.checked, amount: postProcessingCrtAmount } })}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">CRT Curve</span>
              </label>
              {postProcessingCrtEnabled && (
                <Slider
                  label="Amount"
                  value={postProcessingCrtAmount}
                  min={0}
                  max={0.5}
                  step={0.02}
                  onChange={(v) => updatePostProcessing({ crtCurve: { enabled: true, amount: v } })}
                />
              )}
            </div>

            {/* Phosphor */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postProcessingPhosphorEnabled}
                  onChange={(e) => updatePostProcessing({ phosphor: { enabled: e.target.checked, color: postProcessingPhosphorColor } })}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">Phosphor Tint</span>
              </label>
              {postProcessingPhosphorEnabled && (
                <div>
                  <label className="text-xs text-[var(--text-secondary)] block mb-2">Color</label>
                  <div className="flex gap-1">
                    {['#00ff00', '#ff0000', '#00ffff', '#ff00ff', '#ffff00', '#ffffff'].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          const r = parseInt(color.slice(1, 3), 16) / 255;
                          const g = parseInt(color.slice(3, 5), 16) / 255;
                          const b = parseInt(color.slice(5, 7), 16) / 255;
                          updatePostProcessing({ phosphor: { enabled: true, color: [r, g, b] } });
                        }}
                        className={`w-6 h-6 rounded border-2 ${postProcessingPhosphorColor[0] === parseInt(color.slice(1, 3), 16) / 255 &&
                          postProcessingPhosphorColor[1] === parseInt(color.slice(3, 5), 16) / 255 &&
                          postProcessingPhosphorColor[2] === parseInt(color.slice(5, 7), 16) / 255
                            ? 'border-white'
                            : 'border-transparent'
                          }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
