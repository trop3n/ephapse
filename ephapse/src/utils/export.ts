export interface ExportOptions {
  filename?: string;
  scale?: number;
}

export interface VideoExportOptions extends ExportOptions {
  duration?: number;
  fps?: number;
  mimeType?: string;
}

export const ANIMATED_EFFECTS = ['matrixRain', 'waveLines', 'noiseField', 'vhs'];

export function isAnimatedEffect(effect: string | null): boolean {
  return effect !== null && ANIMATED_EFFECTS.includes(effect);
}

export async function captureCanvas(
  _canvas: HTMLCanvasElement,
  device: GPUDevice,
  texture: GPUTexture,
  width: number,
  height: number
): Promise<Blob | null> {
  const bytesPerPixel = 4;
  const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256;
  const bufferSize = bytesPerRow * height;

  const buffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyTextureToBuffer(
    { texture },
    { buffer, bytesPerRow },
    { width, height }
  );
  device.queue.submit([commandEncoder.finish()]);

  await buffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = buffer.getMappedRange();
  const data = new Uint8Array(arrayBuffer);

  const imageData = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * bytesPerRow + x * 4;
      const dstIdx = (y * width + x) * 4;
      imageData.data[dstIdx] = data[srcIdx];
      imageData.data[dstIdx + 1] = data[srcIdx + 1];
      imageData.data[dstIdx + 2] = data[srcIdx + 2];
      imageData.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  buffer.unmap();
  buffer.destroy();

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    tempCanvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function exportPNG(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
  texture: GPUTexture,
  options: ExportOptions = {}
): Promise<void> {
  const width = texture.width;
  const height = texture.height;

  const blob = await captureCanvas(canvas, device, texture, width, height);
  if (!blob) {
    throw new Error('Failed to capture canvas');
  }

  const filename = options.filename || `ephapse-export-${Date.now()}.png`;
  downloadBlob(blob, filename);
}

export async function exportVideo(
  canvas: HTMLCanvasElement,
  options: VideoExportOptions = {}
): Promise<void> {
  const { duration = 5, fps = 30, filename } = options;

  const stream = canvas.captureStream(fps);
  const mimeType = getSupportedMimeType();

  if (!mimeType) {
    throw new Error('Video recording not supported in this browser');
  }

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8000000,
  });

  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
      const blob = new Blob(chunks, { type: mimeType });
      const defaultFilename = `ephapse-export-${Date.now()}.${extension}`;
      downloadBlob(blob, filename || defaultFilename);
      resolve();
    };

    mediaRecorder.onerror = () => {
      reject(new Error('Video recording failed'));
    };

    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, duration * 1000);
  });
}

function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
