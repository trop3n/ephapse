import { Sparkles, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { EffectType } from '../types/webgpu';

const effects: { id: EffectType; name: string; description: string }[] = [
  { id: 'ascii', name: 'ASCII Art', description: 'Convert to text characters' },
  { id: 'dithering', name: 'Dithering', description: 'Error diffusion patterns' },
  { id: 'halftone', name: 'Halftone', description: 'Newspaper dot patterns' },
  { id: 'matrixRain', name: 'Matrix Rain', description: 'Digital rain effect' },
  { id: 'dots', name: 'Dots', description: 'Geometric dot patterns' },
  { id: 'contour', name: 'Contour', description: 'Line contour visualization' },
  { id: 'blur', name: 'Blur', description: 'Gaussian blur effect' },
  { id: 'pixelSort', name: 'Pixel Sort', description: 'Glitch-style sorting' },
  { id: 'blockify', name: 'Blockify', description: 'Block/pixelate effect' },
  { id: 'threshold', name: 'Threshold', description: 'Binary level control' },
  { id: 'edgeDetection', name: 'Edge Detection', description: 'Sobel outlines' },
  { id: 'crosshatch', name: 'Crosshatch', description: 'Engraving lines' },
  { id: 'waveLines', name: 'Wave Lines', description: 'Sine wave patterns' },
  { id: 'noiseField', name: 'Noise Field', description: 'Flowing noise' },
  { id: 'vhs', name: 'VHS', description: 'Retro tape effects' },
  { id: 'voronoi', name: 'Voronoi', description: 'Cellular patterns' },
];

export function EffectsPanel() {
  const activeEffect = useAppStore((state) => state.activeEffect);
  const panels = useAppStore((state) => state.panels);
  const setActiveEffect = useAppStore((state) => state.setActiveEffect);
  const togglePanel = useAppStore((state) => state.togglePanel);

  if (!panels.effects) return null;

  return (
    <div className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col shrink-0">
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border)]">
        <span className="text-sm font-medium">Effects</span>
        <button 
          onClick={() => togglePanel('effects')}
          className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {effects.map((effect) => (
            <button
              key={effect.id}
              onClick={() => setActiveEffect(effect.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                ${activeEffect === effect.id
                  ? 'bg-[var(--accent)]/20 border border-[var(--accent)]/50'
                  : 'hover:bg-[var(--bg-tertiary)] border border-transparent'
                }
              `}
            >
              <Sparkles className={`w-5 h-5 ${activeEffect === effect.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${activeEffect === effect.id ? 'text-[var(--accent)]' : ''}`}>
                  {effect.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {effect.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
