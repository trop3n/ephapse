import { useState } from 'react';
import { Save, Trash2, Download, RotateCcw, Check } from 'lucide-react';
import { useAppStore, type Preset } from '../store/appStore';

const EFFECT_NAMES: Record<string, string> = {
  ascii: 'ASCII',
  blockify: 'Blockify',
  threshold: 'Threshold',
  halftone: 'Halftone',
  dots: 'Dots',
  edgeDetection: 'Edge Detection',
  crosshatch: 'Crosshatch',
  waveLines: 'Wave Lines',
  noiseField: 'Noise Field',
  vhs: 'VHS',
  pixelSort: 'Pixel Sort',
  blur: 'Blur',
  contour: 'Contour',
  voronoi: 'Voronoi',
  matrixRain: 'Matrix Rain',
  dithering: 'Dithering',
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PresetsPanel() {
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loadedId, setLoadedId] = useState<string | null>(null);
  
  const panelsPresets = useAppStore((state) => state.panels.presets);
  const presets = useAppStore((state) => state.presets);
  const activeEffect = useAppStore((state) => state.activeEffect);
  const savePreset = useAppStore((state) => state.savePreset);
  const loadPreset = useAppStore((state) => state.loadPreset);
  const deletePreset = useAppStore((state) => state.deletePreset);
  const renamePreset = useAppStore((state) => state.renamePreset);
  const resetCurrentEffect = useAppStore((state) => state.resetCurrentEffect);
  
  if (!panelsPresets) return null;
  
  const handleSave = () => {
    if (!saveName.trim()) return;
    savePreset(saveName.trim());
    setSaveName('');
  };
  
  const handleLoad = (preset: Preset) => {
    loadPreset(preset.id);
    setLoadedId(preset.id);
    setTimeout(() => setLoadedId(null), 1500);
  };
  
  const handleRename = (id: string) => {
    if (!editingName.trim()) return;
    renamePreset(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };
  
  const groupedPresets = presets.reduce((acc, preset) => {
    const effectKey = preset.effect ?? 'none';
    if (!acc[effectKey]) acc[effectKey] = [];
    acc[effectKey].push(preset);
    return acc;
  }, {} as Record<string, Preset[]>);
  
  const currentEffectPresets = activeEffect ? (groupedPresets[activeEffect] || []) : [];
  
  return (
    <div className="w-64 bg-[var(--bg-secondary)] border-l border-[var(--border)] flex flex-col shrink-0">
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border)]">
        <span className="text-sm font-medium">Presets</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-2">
          <button
            onClick={resetCurrentEffect}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>
        
        <div className="border-t border-[var(--border)] pt-4">
          <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-2">
            Save Current Settings
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Preset name..."
              className="flex-1 px-2 py-1.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-2 py-1.5 rounded bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {currentEffectPresets.length > 0 && (
          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              {activeEffect ? (EFFECT_NAMES[activeEffect] || activeEffect) : 'No Effect'} Presets
            </h3>
            <div className="space-y-2">
              {currentEffectPresets.map((preset: Preset) => (
                <div
                  key={preset.id}
                  className={`p-2 rounded bg-[var(--bg-tertiary)] border ${
                    loadedId === preset.id 
                      ? 'border-[var(--accent)]'
                      : 'border-transparent'
                  }`}
                >
                  {editingId === preset.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(preset.id);
                          if (e.key === 'Escape') {
                            setEditingId(null);
                            setEditingName('');
                          }
                        }}
                        autoFocus
                        className="flex-1 px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => handleRename(preset.id)}
                        className="p-1 hover:bg-[var(--bg-hover)] rounded"
                      >
                        <Check className="w-3 h-3 text-[var(--text-secondary)]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleLoad(preset)}
                          className="flex-1 text-left text-sm font-medium hover:text-[var(--accent)] transition-colors"
                        >
                          {preset.name}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingId(preset.id);
                              setEditingName(preset.name);
                            }}
                            className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)]"
                            title="Rename"
                          >
                            <Download className="w-3 h-3 rotate-45" />
                          </button>
                          <button
                            onClick={() => deletePreset(preset.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {formatDate(preset.createdAt)}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {Object.keys(groupedPresets).filter(e => e !== activeEffect).length > 0 && (
          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              Other Effect Presets
            </h3>
            <div className="space-y-2">
              {Object.entries(groupedPresets)
                .filter(([effect]) => effect !== activeEffect)
                .map(([effect, effectPresets]) => (
                  <div key={effect}>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">
                      {EFFECT_NAMES[effect] || effect} ({effectPresets.length})
                    </p>
                    <div className="space-y-1 pl-2">
                      {effectPresets.slice(0, 3).map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleLoad(preset)}
                          className="w-full text-left text-xs py-1 px-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          {preset.name}
                        </button>
                      ))}
                      {effectPresets.length > 3 && (
                        <p className="text-xs text-[var(--text-secondary)] pl-2">
                          +{effectPresets.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {presets.length === 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <p className="text-sm">No presets saved</p>
            <p className="text-xs mt-1">Save your current settings to create a preset</p>
          </div>
        )}
      </div>
    </div>
  );
}
