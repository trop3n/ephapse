import { useEffect, useRef, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { initWebGPU, setupCanvasContext, resizeCanvas } from '../utils/webgpu';
import { generateFontAtlas, CHARSETS } from '../utils/fontAtlas';
import { AsciiEffect } from '../effects/asciiEffect';
import type { FontAtlas } from '../utils/fontAtlas';

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webgpuRef = useRef<{ device: GPUDevice; context: GPUCanvasContext; format: GPUTextureFormat } | null>(null);
  const effectRef = useRef<AsciiEffect | null>(null);
  const fontAtlasRef = useRef<FontAtlas | null>(null);
  const sourceTextureRef = useRef<GPUTexture | null>(null);
  const animationRef = useRef<number>(0);
  const isActiveRef = useRef(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Individual selectors to prevent object creation on each render
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const inputSource = useAppStore((state) => state.inputSource);
  
  // Settings - use individual selectors
  const cellSize = useAppStore((state) => state.character.cellSize);
  const spacing = useAppStore((state) => state.character.spacing);
  const brightnessMapping = useAppStore((state) => state.character.brightnessMapping);
  const invert = useAppStore((state) => state.character.invert);
  const brightness = useAppStore((state) => state.image.brightness);
  const contrast = useAppStore((state) => state.image.contrast);
  const gamma = useAppStore((state) => state.image.gamma);
  const saturation = useAppStore((state) => state.image.saturation);
  const hue = useAppStore((state) => state.image.hue);
  const sharpness = useAppStore((state) => state.image.sharpness);
  const blur = useAppStore((state) => state.image.blur);
  const colorMode = useAppStore((state) => state.color.mode);
  const useOriginalColors = useAppStore((state) => state.color.useOriginalColors);
  const foregroundColor = useAppStore((state) => state.color.foregroundColor);
  const backgroundColor = useAppStore((state) => state.color.backgroundColor);
  const edgeEnhance = useAppStore((state) => state.advanced.edgeEnhance);
  const quantizeColors = useAppStore((state) => state.advanced.quantizeColors);
  const brightnessWeight = useAppStore((state) => state.advanced.brightnessWeight);
  const matchQuality = useAppStore((state) => state.advanced.matchQuality);

  // Memoize settings object
  const settings = useMemo(() => ({
    cellSize,
    brightness,
    contrast,
    gamma,
    saturation,
    hue,
    invert,
    useOriginalColors,
    customColor: foregroundColor,
    backgroundColor,
    spacing,
    sharpness,
    blur,
    edgeEnhance,
    brightnessMapping,
    quantizeColors,
    brightnessWeight,
    colorMode,
    matchQuality,
  }), [
    cellSize, brightness, contrast, gamma, saturation, hue, invert,
    useOriginalColors, foregroundColor, backgroundColor, spacing,
    sharpness, blur, brightnessMapping, colorMode, edgeEnhance,
    quantizeColors, brightnessWeight, matchQuality
  ]);

  // Initialize WebGPU
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isActiveRef.current = true;
    let resizeHandler: (() => void) | null = null;

    const init = async () => {
      try {
        const result = await initWebGPU();
        if (!isActiveRef.current) return;
        
        if (!result.supported) {
          setError(result.reason);
          return;
        }

        const { device, format } = result;
        const context = setupCanvasContext(canvas, device, format);

        webgpuRef.current = { device, context, format };

        // Generate font atlas
        const fontAtlas = await generateFontAtlas(device, {
          charset: CHARSETS.MEDIUM,
          fontSize: 24,
          fontFamily: 'monospace',
          cols: 8,
        });
        
        if (!isActiveRef.current) {
          fontAtlas.texture.destroy();
          return;
        }
        
        fontAtlasRef.current = fontAtlas;

        // Create ASCII effect
        const effect = new AsciiEffect(device, format, fontAtlas);
        effectRef.current = effect;

        resizeCanvas(canvas);
        setIsReady(true);

        resizeHandler = () => {
          if (canvas) {
            resizeCanvas(canvas);
          }
        };

        window.addEventListener('resize', resizeHandler);
      } catch (err) {
        if (isActiveRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to initialize');
        }
      }
    };

    init();

    return () => {
      isActiveRef.current = false;
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      effectRef.current?.destroy();
      sourceTextureRef.current?.destroy();
    };
  }, []);

  // Create/update source texture when input changes
  useEffect(() => {
    const webgpu = webgpuRef.current;
    if (!webgpu || !inputSource) return;

    // Clean up old texture
    if (sourceTextureRef.current) {
      sourceTextureRef.current.destroy();
    }

    // Create new texture from input
    const texture = webgpu.device.createTexture({
      label: 'Source Texture',
      size: { width: inputSource.width, height: inputSource.height },
      format: 'rgba8unorm',
      usage: 
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    webgpu.device.queue.copyExternalImageToTexture(
      { source: inputSource },
      { texture },
      { width: inputSource.width, height: inputSource.height }
    );

    sourceTextureRef.current = texture;
  }, [inputSource]);

  // Update effect options when settings change
  useEffect(() => {
    const effect = effectRef.current;
    if (!effect) return;

    effect.updateOptions(settings);
  }, [settings]);

  // Render loop
  useEffect(() => {
    const webgpu = webgpuRef.current;
    const effect = effectRef.current;
    const sourceTexture = sourceTextureRef.current;
    
    if (!webgpu || !effect || !sourceTexture) return;

    const { context } = webgpu;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    isActiveRef.current = true;
    
    const render = () => {
      if (!isActiveRef.current) return;
      
      try {
        const outputTexture = context.getCurrentTexture();
        
        effect.render(
          sourceTexture,
          outputTexture.createView(),
          canvas.width,
          canvas.height
        );
      } catch (err) {
        console.error('Render error:', err);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isActiveRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [inputSource, isReady]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
      {/* Toolbar */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <span className="text-sm font-medium">Preview</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(zoom - 0.25)}
            disabled={zoom <= 0.25}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded disabled:opacity-50"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(zoom + 0.25)}
            disabled={zoom >= 3}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded disabled:opacity-50"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded ml-2"
            title="Reset zoom"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-center p-8 text-red-400">
            <h3 className="text-lg font-medium mb-2">WebGPU Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        ) : inputSource ? (
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
              <span className="text-3xl">🎨</span>
            </div>
            <h3 className="text-lg font-medium mb-2">No Input</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-xs">
              Drop an image or click the Input panel to get started
            </p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-8 flex items-center justify-between px-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-4">
          {inputSource && (
            <>
              <span>{inputSource.width} × {inputSource.height}</span>
              <span className="w-px h-3 bg-[var(--border)]" />
              <span>{Math.round((inputSource.width * inputSource.height) / 1000000)} MP</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-[var(--accent)]' : 'bg-yellow-500'} animate-pulse`} />
          <span>{isReady ? 'Ready' : 'Initializing...'}</span>
        </div>
      </div>
    </div>
  );
}
