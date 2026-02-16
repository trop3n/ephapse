import { useEffect, useRef, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { initWebGPU, setupCanvasContext, resizeCanvas } from '../utils/webgpu';
import { generateFontAtlas, CHARSETS } from '../utils/fontAtlas';
import { AsciiEffect } from '../effects/asciiEffect';
import { PostProcessEffect } from '../effects/postProcessEffect';
import type { FontAtlas } from '../utils/fontAtlas';

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webgpuRef = useRef<{ device: GPUDevice; context: GPUCanvasContext; format: GPUTextureFormat } | null>(null);
  const asciiEffectRef = useRef<AsciiEffect | null>(null);
  const postProcessRef = useRef<PostProcessEffect | null>(null);
  const fontAtlasRef = useRef<FontAtlas | null>(null);
  const sourceTextureRef = useRef<GPUTexture | null>(null);
  const intermediateTextureRef = useRef<GPUTexture | null>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const isActiveRef = useRef(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const inputSource = useAppStore((state) => state.inputSource);

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

  const bloom = useAppStore((state) => state.postProcessing.bloom);
  const grain = useAppStore((state) => state.postProcessing.grain);
  const chromatic = useAppStore((state) => state.postProcessing.chromatic);
  const scanlines = useAppStore((state) => state.postProcessing.scanlines);
  const vignette = useAppStore((state) => state.postProcessing.vignette);
  const crtCurve = useAppStore((state) => state.postProcessing.crtCurve);
  const phosphor = useAppStore((state) => state.postProcessing.phosphor);

  const asciiSettings = useMemo(() => ({
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

  const postProcessSettings = useMemo(() => ({
    bloom: { enabled: bloom.enabled, intensity: bloom.intensity, threshold: 0.7, radius: 3 },
    grain: { enabled: grain.enabled, intensity: grain.intensity, size: grain.size, speed: grain.speed },
    chromatic: { enabled: chromatic.enabled, offset: chromatic.offset },
    scanlines: { enabled: scanlines.enabled, opacity: scanlines.opacity, spacing: scanlines.spacing },
    vignette: { enabled: vignette.enabled, intensity: vignette.intensity, radius: vignette.radius },
    crt: { enabled: crtCurve.enabled, amount: crtCurve.amount },
    phosphor: { enabled: phosphor.enabled, color: phosphor.color },
  }), [bloom, grain, chromatic, scanlines, vignette, crtCurve, phosphor]);

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

        const asciiEffect = new AsciiEffect(device, format, fontAtlas);
        asciiEffectRef.current = asciiEffect;

        const postProcess = new PostProcessEffect(device, format);
        postProcessRef.current = postProcess;

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
      asciiEffectRef.current?.destroy();
      postProcessRef.current?.destroy();
      sourceTextureRef.current?.destroy();
      intermediateTextureRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const webgpu = webgpuRef.current;
    if (!webgpu || !inputSource) return;

    if (sourceTextureRef.current) {
      sourceTextureRef.current.destroy();
    }

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

  useEffect(() => {
    const effect = asciiEffectRef.current;
    if (!effect) return;
    effect.updateOptions(asciiSettings);
  }, [asciiSettings]);

  useEffect(() => {
    const effect = postProcessRef.current;
    if (!effect) return;
    effect.updateOptions({ ...postProcessSettings, time: timeRef.current });
  }, [postProcessSettings]);

  useEffect(() => {
    const webgpu = webgpuRef.current;
    const asciiEffect = asciiEffectRef.current;
    const postProcess = postProcessRef.current;
    const sourceTexture = sourceTextureRef.current;

    if (!webgpu || !asciiEffect || !postProcess || !sourceTexture) return;

    const { context } = webgpu;
    const canvas = canvasRef.current;
    if (!canvas) return;

    isActiveRef.current = true;

    let lastTime = performance.now();

    const ensureIntermediateTexture = (width: number, height: number) => {
      if (
        intermediateTextureRef.current &&
        intermediateTextureRef.current.width === width &&
        intermediateTextureRef.current.height === height
      ) {
        return intermediateTextureRef.current;
      }

      intermediateTextureRef.current?.destroy();

      const texture = webgpu.device.createTexture({
        label: 'Intermediate Texture',
        size: { width, height },
        format: webgpu.format,
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      intermediateTextureRef.current = texture;
      return texture;
    };

    const hasPostProcessing =
      bloom.enabled ||
      grain.enabled ||
      chromatic.enabled ||
      scanlines.enabled ||
      vignette.enabled ||
      crtCurve.enabled ||
      phosphor.enabled;

    const render = () => {
      if (!isActiveRef.current) return;

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += delta;

      if (grain.enabled) {
        postProcess?.updateOptions({ time: timeRef.current });
      }

      try {
        const outputTexture = context.getCurrentTexture();
        const width = canvas.width;
        const height = canvas.height;

        if (hasPostProcessing) {
          const intermediate = ensureIntermediateTexture(width, height);

          asciiEffect.render(
            sourceTexture,
            intermediate.createView(),
            width,
            height
          );

          postProcess.render(
            intermediate,
            outputTexture.createView(),
            width,
            height
          );
        } else {
          asciiEffect.render(
            sourceTexture,
            outputTexture.createView(),
            width,
            height
          );
        }
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
  }, [inputSource, isReady, bloom.enabled, grain.enabled, chromatic.enabled, scanlines.enabled, vignette.enabled, crtCurve.enabled, phosphor.enabled]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
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
