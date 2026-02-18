import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { initWebGPU, setupCanvasContext } from '../utils/webgpu';
import { generateFontAtlas, CHARSETS } from '../utils/fontAtlas';
import { captureCanvas, downloadBlob } from '../utils/export';
import { AsciiEffect } from '../effects/asciiEffect';
import { PostProcessEffect } from '../effects/postProcessEffect';
import { BlockifyEffect } from '../effects/blockifyEffect';
import { ThresholdEffect } from '../effects/thresholdEffect';
import { HalftoneEffect } from '../effects/halftoneEffect';
import { DotsEffect } from '../effects/dotsEffect';
import { EdgeDetectionEffect } from '../effects/edgeDetectionEffect';
import { CrosshatchEffect } from '../effects/crosshatchEffect';
import { WaveLinesEffect } from '../effects/waveLinesEffect';
import { NoiseFieldEffect } from '../effects/noiseFieldEffect';
import { VhsEffect } from '../effects/vhsEffect';
import { PixelSortEffect } from '../effects/pixelSortEffect';
import { BlurEffect } from '../effects/blurEffect';
import { ContourEffect } from '../effects/contourEffect';
import { VoronoiEffect } from '../effects/voronoiEffect';
import { MatrixRainEffect } from '../effects/matrixRainEffect';
import { DitheringEffect } from '../effects/ditheringEffect';
import type { FontAtlas } from '../utils/fontAtlas';

export interface PreviewExportHandle {
  exportPNG: () => Promise<void>;
  exportVideo: (duration: number) => Promise<void>;
}

export const Preview = forwardRef<PreviewExportHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webgpuRef = useRef<{ device: GPUDevice; context: GPUCanvasContext; format: GPUTextureFormat } | null>(null);
  const asciiEffectRef = useRef<AsciiEffect | null>(null);
  const blockifyEffectRef = useRef<BlockifyEffect | null>(null);
  const thresholdEffectRef = useRef<ThresholdEffect | null>(null);
  const halftoneEffectRef = useRef<HalftoneEffect | null>(null);
  const dotsEffectRef = useRef<DotsEffect | null>(null);
  const edgeDetectionRef = useRef<EdgeDetectionEffect | null>(null);
  const crosshatchRef = useRef<CrosshatchEffect | null>(null);
  const waveLinesRef = useRef<WaveLinesEffect | null>(null);
  const noiseFieldRef = useRef<NoiseFieldEffect | null>(null);
  const vhsRef = useRef<VhsEffect | null>(null);
  const pixelSortRef = useRef<PixelSortEffect | null>(null);
  const blurRef = useRef<BlurEffect | null>(null);
  const contourRef = useRef<ContourEffect | null>(null);
  const voronoiRef = useRef<VoronoiEffect | null>(null);
  const matrixRainRef = useRef<MatrixRainEffect | null>(null);
  const ditheringRef = useRef<DitheringEffect | null>(null);
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
  const activeEffect = useAppStore((state) => state.activeEffect);

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

  const blockifySize = useAppStore((state) => state.effectSettings.blockifySize);
  const blockifyStyle = useAppStore((state) => state.effectSettings.blockifyStyle);
  const blockifyBorderWidth = useAppStore((state) => state.effectSettings.blockifyBorderWidth);
  const blockifyBorderColor = useAppStore((state) => state.effectSettings.blockifyBorderColor);
  const blockifyGrayscale = useAppStore((state) => state.effectSettings.blockifyGrayscale);

  const thresholdLevels = useAppStore((state) => state.effectSettings.thresholdLevels);
  const thresholdDither = useAppStore((state) => state.effectSettings.thresholdDither);
  const thresholdPoint = useAppStore((state) => state.effectSettings.thresholdPoint);
  const thresholdInvert = useAppStore((state) => state.effectSettings.thresholdInvert);
  const thresholdForeground = useAppStore((state) => state.effectSettings.thresholdForeground);
  const thresholdBackground = useAppStore((state) => state.effectSettings.thresholdBackground);
  const thresholdPreserveColors = useAppStore((state) => state.effectSettings.thresholdPreserveColors);

  const halftoneSpacing = useAppStore((state) => state.effectSettings.halftoneSpacing);
  const halftoneAngle = useAppStore((state) => state.effectSettings.halftoneAngle);
  const halftoneShape = useAppStore((state) => state.effectSettings.halftoneShape);
  const halftoneInvert = useAppStore((state) => state.effectSettings.halftoneInvert);
  const halftoneColorMode = useAppStore((state) => state.effectSettings.halftoneColorMode);
  const halftoneForeground = useAppStore((state) => state.effectSettings.halftoneForeground);
  const halftoneBackground = useAppStore((state) => state.effectSettings.halftoneBackground);

  const dotsSpacing = useAppStore((state) => state.effectSettings.dotsSpacing);
  const dotsSize = useAppStore((state) => state.effectSettings.dotsSize);
  const dotsShape = useAppStore((state) => state.effectSettings.dotsShape);
  const dotsGridType = useAppStore((state) => state.effectSettings.dotsGridType);
  const dotsInvert = useAppStore((state) => state.effectSettings.dotsInvert);
  const dotsColorMode = useAppStore((state) => state.effectSettings.dotsColorMode);
  const dotsForeground = useAppStore((state) => state.effectSettings.dotsForeground);
  const dotsBackground = useAppStore((state) => state.effectSettings.dotsBackground);

  const edgeThreshold = useAppStore((state) => state.effectSettings.edgeThreshold);
  const edgeLineWidth = useAppStore((state) => state.effectSettings.edgeLineWidth);
  const edgeAlgorithm = useAppStore((state) => state.effectSettings.edgeAlgorithm);
  const edgeInvert = useAppStore((state) => state.effectSettings.edgeInvert);
  const edgeColorMode = useAppStore((state) => state.effectSettings.edgeColorMode);
  const edgeColor = useAppStore((state) => state.effectSettings.edgeColor);
  const edgeBgColor = useAppStore((state) => state.effectSettings.edgeBgColor);

  const crosshatchDensity = useAppStore((state) => state.effectSettings.crosshatchDensity);
  const crosshatchAngle = useAppStore((state) => state.effectSettings.crosshatchAngle);
  const crosshatchLayers = useAppStore((state) => state.effectSettings.crosshatchLayers);
  const crosshatchLineWidth = useAppStore((state) => state.effectSettings.crosshatchLineWidth);
  const crosshatchInvert = useAppStore((state) => state.effectSettings.crosshatchInvert);
  const crosshatchRandomness = useAppStore((state) => state.effectSettings.crosshatchRandomness);
  const crosshatchForeground = useAppStore((state) => state.effectSettings.crosshatchForeground);
  const crosshatchBackground = useAppStore((state) => state.effectSettings.crosshatchBackground);

  const waveLinesCount = useAppStore((state) => state.effectSettings.waveLinesCount);
  const waveLinesAmplitude = useAppStore((state) => state.effectSettings.waveLinesAmplitude);
  const waveLinesFrequency = useAppStore((state) => state.effectSettings.waveLinesFrequency);
  const waveLinesThickness = useAppStore((state) => state.effectSettings.waveLinesThickness);
  const waveLinesDirection = useAppStore((state) => state.effectSettings.waveLinesDirection);
  const waveLinesColorMode = useAppStore((state) => state.effectSettings.waveLinesColorMode);
  const waveLinesAnimate = useAppStore((state) => state.effectSettings.waveLinesAnimate);
  const waveLinesForeground = useAppStore((state) => state.effectSettings.waveLinesForeground);
  const waveLinesBackground = useAppStore((state) => state.effectSettings.waveLinesBackground);

  const noiseFieldScale = useAppStore((state) => state.effectSettings.noiseFieldScale);
  const noiseFieldIntensity = useAppStore((state) => state.effectSettings.noiseFieldIntensity);
  const noiseFieldSpeed = useAppStore((state) => state.effectSettings.noiseFieldSpeed);
  const noiseFieldOctaves = useAppStore((state) => state.effectSettings.noiseFieldOctaves);
  const noiseFieldType = useAppStore((state) => state.effectSettings.noiseFieldType);
  const noiseFieldDistortOnly = useAppStore((state) => state.effectSettings.noiseFieldDistortOnly);
  const noiseFieldAnimate = useAppStore((state) => state.effectSettings.noiseFieldAnimate);

  const vhsDistortion = useAppStore((state) => state.effectSettings.vhsDistortion);
  const vhsNoise = useAppStore((state) => state.effectSettings.vhsNoise);
  const vhsColorBleed = useAppStore((state) => state.effectSettings.vhsColorBleed);
  const vhsScanlines = useAppStore((state) => state.effectSettings.vhsScanlines);
  const vhsTrackingError = useAppStore((state) => state.effectSettings.vhsTrackingError);

  const pixelSortThreshold = useAppStore((state) => state.effectSettings.pixelSortThreshold);
  const pixelSortDirection = useAppStore((state) => state.effectSettings.pixelSortDirection);
  const pixelSortMode = useAppStore((state) => state.effectSettings.pixelSortMode);
  const pixelSortStreakLength = useAppStore((state) => state.effectSettings.pixelSortStreakLength);
  const pixelSortIntensity = useAppStore((state) => state.effectSettings.pixelSortIntensity);
  const pixelSortRandomness = useAppStore((state) => state.effectSettings.pixelSortRandomness);
  const pixelSortReverse = useAppStore((state) => state.effectSettings.pixelSortReverse);

  const blurRadius = useAppStore((state) => state.effectSettings.blurRadius);

  const contourLevels = useAppStore((state) => state.effectSettings.contourLevels);
  const contourLineThickness = useAppStore((state) => state.effectSettings.contourLineThickness);
  const contourFillMode = useAppStore((state) => state.effectSettings.contourFillMode);
  const contourColorMode = useAppStore((state) => state.effectSettings.contourColorMode);
  const contourInvert = useAppStore((state) => state.effectSettings.contourInvert);
  const contourLineColor = useAppStore((state) => state.effectSettings.contourLineColor);
  const contourBgColor = useAppStore((state) => state.effectSettings.contourBgColor);

  const voronoiCellSize = useAppStore((state) => state.effectSettings.voronoiCellSize);
  const voronoiEdgeWidth = useAppStore((state) => state.effectSettings.voronoiEdgeWidth);
  const voronoiEdgeColor = useAppStore((state) => state.effectSettings.voronoiEdgeColor);
  const voronoiColorMode = useAppStore((state) => state.effectSettings.voronoiColorMode);
  const voronoiRandomize = useAppStore((state) => state.effectSettings.voronoiRandomize);

  const matrixRainCellSize = useAppStore((state) => state.effectSettings.matrixRainCellSize);
  const matrixRainSpeed = useAppStore((state) => state.effectSettings.matrixRainSpeed);
  const matrixRainTrailLength = useAppStore((state) => state.effectSettings.matrixRainTrailLength);
  const matrixRainColor = useAppStore((state) => state.effectSettings.matrixRainColor);
  const matrixRainBgOpacity = useAppStore((state) => state.effectSettings.matrixRainBgOpacity);
  const matrixRainGlowIntensity = useAppStore((state) => state.effectSettings.matrixRainGlowIntensity);
  const matrixRainDirection = useAppStore((state) => state.effectSettings.matrixRainDirection);
  const matrixRainThreshold = useAppStore((state) => state.effectSettings.matrixRainThreshold);
  const matrixRainSpacing = useAppStore((state) => state.effectSettings.matrixRainSpacing);

  const ditheringMethod = useAppStore((state) => state.effectSettings.ditheringMethod);
  const ditheringColorLevels = useAppStore((state) => state.effectSettings.ditheringColorLevels);
  const ditheringMatrixSize = useAppStore((state) => state.effectSettings.ditheringMatrixSize);

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

  const blockifySettings = useMemo(() => ({
    blockSize: blockifySize,
    style: blockifyStyle,
    borderWidth: blockifyBorderWidth,
    borderColor: blockifyBorderColor,
    colorMode: blockifyGrayscale ? 1 : 0,
    brightness: 0,
    contrast: 0,
  }), [blockifySize, blockifyStyle, blockifyBorderWidth, blockifyBorderColor, blockifyGrayscale]);

  const thresholdSettings = useMemo(() => ({
    levels: thresholdLevels,
    dither: thresholdDither,
    thresholdPoint: thresholdPoint,
    invert: thresholdInvert,
    foregroundColor: thresholdForeground,
    backgroundColor: thresholdBackground,
    preserveColors: thresholdPreserveColors,
    brightness: 0,
    contrast: 0,
  }), [thresholdLevels, thresholdDither, thresholdPoint, thresholdInvert, thresholdForeground, thresholdBackground, thresholdPreserveColors]);

  const halftoneSettings = useMemo(() => ({
    spacing: halftoneSpacing,
    angle: halftoneAngle,
    shape: halftoneShape,
    invert: halftoneInvert,
    colorMode: halftoneColorMode,
    foregroundColor: halftoneForeground,
    backgroundColor: halftoneBackground,
    dotScale: 1,
    brightness: 0,
    contrast: 0,
  }), [halftoneSpacing, halftoneAngle, halftoneShape, halftoneInvert, halftoneColorMode, halftoneForeground, halftoneBackground]);

  const dotsSettings = useMemo(() => ({
    spacing: dotsSpacing,
    sizeMultiplier: dotsSize,
    shape: dotsShape,
    gridType: dotsGridType,
    invert: dotsInvert,
    colorMode: dotsColorMode,
    foregroundColor: dotsForeground,
    backgroundColor: dotsBackground,
    brightness: 0,
    contrast: 0,
  }), [dotsSpacing, dotsSize, dotsShape, dotsGridType, dotsInvert, dotsColorMode, dotsForeground, dotsBackground]);

  const edgeDetectionSettings = useMemo(() => ({
    threshold: edgeThreshold,
    lineWidth: edgeLineWidth,
    algorithm: edgeAlgorithm,
    invert: edgeInvert,
    colorMode: edgeColorMode,
    edgeColor: edgeColor,
    bgColor: edgeBgColor,
    brightness: 0,
    contrast: 0,
  }), [edgeThreshold, edgeLineWidth, edgeAlgorithm, edgeInvert, edgeColorMode, edgeColor, edgeBgColor]);

  const crosshatchSettings = useMemo(() => ({
    density: crosshatchDensity,
    angle: crosshatchAngle,
    layers: crosshatchLayers,
    lineWidth: crosshatchLineWidth,
    invert: crosshatchInvert,
    randomness: crosshatchRandomness,
    foregroundColor: crosshatchForeground,
    backgroundColor: crosshatchBackground,
    brightness: 0,
    contrast: 0,
  }), [crosshatchDensity, crosshatchAngle, crosshatchLayers, crosshatchLineWidth, crosshatchInvert, crosshatchRandomness, crosshatchForeground, crosshatchBackground]);

  const waveLinesSettings = useMemo(() => ({
    lineCount: waveLinesCount,
    amplitude: waveLinesAmplitude,
    frequency: waveLinesFrequency,
    lineThickness: waveLinesThickness,
    direction: waveLinesDirection,
    colorMode: waveLinesColorMode,
    animate: waveLinesAnimate,
    foregroundColor: waveLinesForeground,
    backgroundColor: waveLinesBackground,
    brightness: 0,
    contrast: 0,
    time: 0,
  }), [waveLinesCount, waveLinesAmplitude, waveLinesFrequency, waveLinesThickness, waveLinesDirection, waveLinesColorMode, waveLinesAnimate, waveLinesForeground, waveLinesBackground]);

  const noiseFieldSettings = useMemo(() => ({
    scale: noiseFieldScale,
    intensity: noiseFieldIntensity,
    speed: noiseFieldSpeed,
    octaves: noiseFieldOctaves,
    noiseType: noiseFieldType,
    distortOnly: noiseFieldDistortOnly,
    animate: noiseFieldAnimate,
    brightness: 0,
    contrast: 0,
    time: 0,
  }), [noiseFieldScale, noiseFieldIntensity, noiseFieldSpeed, noiseFieldOctaves, noiseFieldType, noiseFieldDistortOnly, noiseFieldAnimate]);

  const vhsSettings = useMemo(() => ({
    distortion: vhsDistortion,
    noise: vhsNoise,
    colorBleed: vhsColorBleed,
    scanlines: vhsScanlines,
    trackingError: vhsTrackingError,
    brightness: 0,
    contrast: 0,
    time: 0,
  }), [vhsDistortion, vhsNoise, vhsColorBleed, vhsScanlines, vhsTrackingError]);

  const pixelSortSettings = useMemo(() => ({
    threshold: pixelSortThreshold,
    direction: pixelSortDirection,
    mode: pixelSortMode,
    streakLength: pixelSortStreakLength,
    intensity: pixelSortIntensity,
    randomness: pixelSortRandomness,
    reverse: pixelSortReverse,
    brightness: 0,
    contrast: 0,
  }), [pixelSortThreshold, pixelSortDirection, pixelSortMode, pixelSortStreakLength, pixelSortIntensity, pixelSortRandomness, pixelSortReverse]);

  const blurSettings = useMemo(() => ({
    radius: blurRadius,
    brightness: 0,
    contrast: 0,
  }), [blurRadius]);

  const contourSettings = useMemo(() => ({
    levels: contourLevels,
    lineThickness: contourLineThickness,
    fillMode: contourFillMode,
    colorMode: contourColorMode,
    invert: contourInvert,
    lineColor: contourLineColor,
    bgColor: contourBgColor,
    brightness: 0,
    contrast: 0,
  }), [contourLevels, contourLineThickness, contourFillMode, contourColorMode, contourInvert, contourLineColor, contourBgColor]);

  const voronoiSettings = useMemo(() => ({
    cellSize: voronoiCellSize,
    edgeWidth: voronoiEdgeWidth,
    edgeColor: voronoiEdgeColor,
    colorMode: voronoiColorMode,
    randomize: voronoiRandomize,
    brightness: 0,
    contrast: 0,
  }), [voronoiCellSize, voronoiEdgeWidth, voronoiEdgeColor, voronoiColorMode, voronoiRandomize]);

  const matrixRainSettings = useMemo(() => ({
    cellSize: matrixRainCellSize,
    speed: matrixRainSpeed,
    trailLength: matrixRainTrailLength,
    rainColor: matrixRainColor,
    bgOpacity: matrixRainBgOpacity,
    glowIntensity: matrixRainGlowIntensity,
    direction: matrixRainDirection,
    threshold: matrixRainThreshold,
    spacing: matrixRainSpacing,
    brightness: 0,
    contrast: 0,
    time: 0,
  }), [matrixRainCellSize, matrixRainSpeed, matrixRainTrailLength, matrixRainColor, matrixRainBgOpacity, matrixRainGlowIntensity, matrixRainDirection, matrixRainThreshold, matrixRainSpacing]);

  const ditheringSettings = useMemo(() => ({
    method: ditheringMethod,
    colorLevels: ditheringColorLevels,
    matrixSize: ditheringMatrixSize,
    brightness: 0,
    contrast: 0,
  }), [ditheringMethod, ditheringColorLevels, ditheringMatrixSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isActiveRef.current = true;
    let resizeObserver: ResizeObserver | null = null;
    let animationFrameId: number | null = null;

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        const parent = canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const dpr = Math.min(window.devicePixelRatio, 2);
          const width = Math.floor(rect.width * dpr);
          const height = Math.floor(rect.height * dpr);
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
        }
      }
    };

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

        const blockifyEffect = new BlockifyEffect(device, format);
        blockifyEffectRef.current = blockifyEffect;

        const thresholdEffect = new ThresholdEffect(device, format);
        thresholdEffectRef.current = thresholdEffect;

        const halftoneEffect = new HalftoneEffect(device, format);
        halftoneEffectRef.current = halftoneEffect;

        const dotsEffect = new DotsEffect(device, format);
        dotsEffectRef.current = dotsEffect;

        const edgeDetectionEffect = new EdgeDetectionEffect(device, format);
        edgeDetectionRef.current = edgeDetectionEffect;

        const crosshatchEffect = new CrosshatchEffect(device, format);
        crosshatchRef.current = crosshatchEffect;

        const waveLinesEffect = new WaveLinesEffect(device, format);
        waveLinesRef.current = waveLinesEffect;

        const noiseFieldEffect = new NoiseFieldEffect(device, format);
        noiseFieldRef.current = noiseFieldEffect;

        const vhsEffect = new VhsEffect(device, format);
        vhsRef.current = vhsEffect;

        const pixelSortEffect = new PixelSortEffect(device, format);
        pixelSortRef.current = pixelSortEffect;

        const blurEffect = new BlurEffect(device, format);
        blurRef.current = blurEffect;

        const contourEffect = new ContourEffect(device, format);
        contourRef.current = contourEffect;

        const voronoiEffect = new VoronoiEffect(device, format);
        voronoiRef.current = voronoiEffect;

        const matrixRainEffect = new MatrixRainEffect(device, format);
        matrixRainRef.current = matrixRainEffect;

        const ditheringEffect = new DitheringEffect(device, format);
        ditheringRef.current = ditheringEffect;

        const postProcess = new PostProcessEffect(device, format);
        postProcessRef.current = postProcess;

        animationFrameId = requestAnimationFrame(() => {
          handleResize();
          setIsReady(true);
        });

        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(canvas.parentElement!);
      } catch (err) {
        if (isActiveRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to initialize');
        }
      }
    };

    init();

    return () => {
      isActiveRef.current = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      asciiEffectRef.current?.destroy();
      blockifyEffectRef.current?.destroy();
      thresholdEffectRef.current?.destroy();
      halftoneEffectRef.current?.destroy();
      dotsEffectRef.current?.destroy();
      edgeDetectionRef.current?.destroy();
      crosshatchRef.current?.destroy();
      waveLinesRef.current?.destroy();
      noiseFieldRef.current?.destroy();
      vhsRef.current?.destroy();
      pixelSortRef.current?.destroy();
      blurRef.current?.destroy();
      contourRef.current?.destroy();
      voronoiRef.current?.destroy();
      matrixRainRef.current?.destroy();
      ditheringRef.current?.destroy();
      postProcessRef.current?.destroy();
      sourceTextureRef.current?.destroy();
      intermediateTextureRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const webgpu = webgpuRef.current;
    const canvas = canvasRef.current;
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

    if (canvas && canvas.parentElement) {
      const parent = canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dpr = Math.min(window.devicePixelRatio, 2);
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
    }
  }, [inputSource]);

  useEffect(() => {
    const effect = asciiEffectRef.current;
    if (!effect) return;
    effect.updateOptions(asciiSettings);
  }, [asciiSettings]);

  useEffect(() => {
    const effect = blockifyEffectRef.current;
    if (!effect) return;
    effect.updateOptions(blockifySettings);
  }, [blockifySettings]);

  useEffect(() => {
    const effect = thresholdEffectRef.current;
    if (!effect) return;
    effect.updateOptions(thresholdSettings);
  }, [thresholdSettings]);

  useEffect(() => {
    const effect = halftoneEffectRef.current;
    if (!effect) return;
    effect.updateOptions(halftoneSettings);
  }, [halftoneSettings]);

  useEffect(() => {
    const effect = dotsEffectRef.current;
    if (!effect) return;
    effect.updateOptions(dotsSettings);
  }, [dotsSettings]);

  useEffect(() => {
    const effect = edgeDetectionRef.current;
    if (!effect) return;
    effect.updateOptions(edgeDetectionSettings);
  }, [edgeDetectionSettings]);

  useEffect(() => {
    const effect = crosshatchRef.current;
    if (!effect) return;
    effect.updateOptions(crosshatchSettings);
  }, [crosshatchSettings]);

  useEffect(() => {
    const effect = waveLinesRef.current;
    if (!effect) return;
    effect.updateOptions({ ...waveLinesSettings, time: timeRef.current });
  }, [waveLinesSettings]);

  useEffect(() => {
    const effect = noiseFieldRef.current;
    if (!effect) return;
    effect.updateOptions({ ...noiseFieldSettings, time: timeRef.current });
  }, [noiseFieldSettings]);

  useEffect(() => {
    const effect = vhsRef.current;
    if (!effect) return;
    effect.updateOptions({ ...vhsSettings, time: timeRef.current });
  }, [vhsSettings]);

  useEffect(() => {
    const effect = pixelSortRef.current;
    if (!effect) return;
    effect.updateOptions(pixelSortSettings);
  }, [pixelSortSettings]);

  useEffect(() => {
    const effect = blurRef.current;
    if (!effect) return;
    effect.updateOptions(blurSettings);
  }, [blurSettings]);

  useEffect(() => {
    const effect = contourRef.current;
    if (!effect) return;
    effect.updateOptions(contourSettings);
  }, [contourSettings]);

  useEffect(() => {
    const effect = voronoiRef.current;
    if (!effect) return;
    effect.updateOptions(voronoiSettings);
  }, [voronoiSettings]);

  useEffect(() => {
    const effect = matrixRainRef.current;
    if (!effect) return;
    effect.updateOptions({ ...matrixRainSettings, time: timeRef.current });
  }, [matrixRainSettings]);

  useEffect(() => {
    const effect = ditheringRef.current;
    if (!effect) return;
    effect.updateOptions(ditheringSettings);
  }, [ditheringSettings]);

  useEffect(() => {
    const effect = postProcessRef.current;
    if (!effect) return;
    effect.updateOptions({ ...postProcessSettings, time: timeRef.current });
  }, [postProcessSettings]);

  useEffect(() => {
    const webgpu = webgpuRef.current;
    const asciiEffect = asciiEffectRef.current;
    const blockifyEffect = blockifyEffectRef.current;
    const thresholdEffect = thresholdEffectRef.current;
    const postProcess = postProcessRef.current;

    if (!webgpu || !asciiEffect || !postProcess) return;

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

    const getActiveEffect = () => {
      switch (activeEffect) {
        case 'blockify':
          return blockifyEffect;
        case 'threshold':
          return thresholdEffect;
        case 'halftone':
          return halftoneEffectRef.current;
        case 'dots':
          return dotsEffectRef.current;
        case 'edgeDetection':
          return edgeDetectionRef.current;
        case 'crosshatch':
          return crosshatchRef.current;
        case 'waveLines':
          return waveLinesRef.current;
        case 'noiseField':
          return noiseFieldRef.current;
        case 'vhs':
          return vhsRef.current;
        case 'pixelSort':
          return pixelSortRef.current;
        case 'blur':
          return blurRef.current;
        case 'contour':
          return contourRef.current;
        case 'voronoi':
          return voronoiRef.current;
        case 'matrixRain':
          return matrixRainRef.current;
        case 'dithering':
          return ditheringRef.current;
        case 'ascii':
        default:
          return asciiEffect;
      }
    };

    const render = () => {
      if (!isActiveRef.current) return;

      const sourceTexture = sourceTextureRef.current;
      if (!sourceTexture) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += delta;

      if (grain.enabled) {
        postProcess?.updateOptions({ time: timeRef.current });
      }

      if (waveLinesAnimate) {
        waveLinesRef.current?.updateOptions({ time: timeRef.current });
      }

      if (noiseFieldAnimate) {
        noiseFieldRef.current?.updateOptions({ time: timeRef.current });
      }

      vhsRef.current?.updateOptions({ time: timeRef.current });

      matrixRainRef.current?.updateOptions({ time: timeRef.current });

      try {
        const outputTexture = context.getCurrentTexture();
        const width = canvas.width;
        const height = canvas.height;

        if (width === 0 || height === 0) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }

        const effect = getActiveEffect();
        if (!effect) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }

        if (hasPostProcessing) {
          const intermediate = ensureIntermediateTexture(width, height);

          effect.render(
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
          effect.render(
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
  }, [isReady, activeEffect, bloom.enabled, grain.enabled, chromatic.enabled, scanlines.enabled, vignette.enabled, crtCurve.enabled, phosphor.enabled, waveLinesAnimate, noiseFieldAnimate]);

  const exportPNG = useCallback(async () => {
    const canvas = canvasRef.current;
    const webgpu = webgpuRef.current;
    const sourceTexture = sourceTextureRef.current;

    if (!canvas || !webgpu || !sourceTexture) {
      throw new Error('No image loaded');
    }

    const blob = await captureCanvas(
      canvas,
      webgpu.device,
      sourceTexture,
      sourceTexture.width,
      sourceTexture.height
    );

    if (!blob) {
      throw new Error('Failed to capture image');
    }

    const filename = `ephapse-${activeEffect || 'export'}-${Date.now()}.png`;
    downloadBlob(blob, filename);
  }, [activeEffect]);

  const exportVideo = useCallback(async (duration: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('No canvas available');
    }

    const stream = canvas.captureStream(30);
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    let mimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    if (!mimeType) {
      throw new Error('Video recording not supported');
    }

    return new Promise<void>((resolve, reject) => {
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const filename = `ephapse-${activeEffect || 'export'}-${Date.now()}.webm`;
        downloadBlob(blob, filename);
        resolve();
      };

      mediaRecorder.onerror = () => {
        reject(new Error('Recording failed'));
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), duration * 1000);
    });
  }, [activeEffect]);

  useImperativeHandle(ref, () => ({
    exportPNG,
    exportVideo,
  }), [exportPNG, exportVideo]);

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

      <div className="flex-1 relative overflow-hidden flex items-center justify-center min-h-0">
        {error ? (
          <div className="text-center p-8 text-red-400">
            <h3 className="text-lg font-medium mb-2">WebGPU Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />
            {!inputSource && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[var(--bg-primary)]">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <span className="text-3xl">🎨</span>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Input</h3>
                  <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                    Drop an image or click the Input panel to get started
                  </p>
                </div>
              </div>
            )}
          </>
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
});
