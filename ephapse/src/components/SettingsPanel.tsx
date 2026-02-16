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
  
  const togglePanel = useAppStore((state) => state.togglePanel);
  const toggleSettingsSection = useAppStore((state) => state.toggleSettingsSection);
  const updateCharacter = useAppStore((state) => state.updateCharacter);
  const updateImage = useAppStore((state) => state.updateImage);
  const updateColor = useAppStore((state) => state.updateColor);
  const updateAdvanced = useAppStore((state) => state.updateAdvanced);
  const updatePostProcessing = useAppStore((state) => state.updatePostProcessing);
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
