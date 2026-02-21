import { Upload, Camera, Image as ImageIcon, X, Video } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useRef, useCallback, useState } from 'react';
import { createImageBitmapFromFile } from '../utils/webgpu';

export function InputPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const inputSource = useAppStore((state) => state.inputSource);
  const inputType = useAppStore((state) => state.inputType);
  const inputFile = useAppStore((state) => state.inputFile);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const panelsInput = useAppStore((state) => state.panels.input);
  const setInput = useAppStore((state) => state.setInput);
  const setInputFile = useAppStore((state) => state.setInputFile);
  const setLoading = useAppStore((state) => state.setLoading);
  const setError = useAppStore((state) => state.setError);
  const clearInput = useAppStore((state) => state.clearInput);
  const togglePanel = useAppStore((state) => state.togglePanel);

  const handleImageFile = useCallback(async (file: File) => {
    setInputFile(file);
    const imageBitmap = await createImageBitmapFromFile(file);
    
    setInput(
      'image',
      imageBitmap,
      imageBitmap.width,
      imageBitmap.height
    );
  }, [setInput, setInputFile]);

  const handleVideoFile = useCallback(async (file: File) => {
    setInputFile(file);
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    
    videoRef.current = video;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.currentTime = 0;
        resolve();
      };
      video.onerror = () => reject(new Error('Failed to load video'));
    });
    
    await video.play();
    setIsPlaying(true);
    
    setInput(
      'video',
      video,
      video.videoWidth,
      video.videoHeight
    );
  }, [setInput, setInputFile]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      if (file.type.startsWith('image/')) {
        await handleImageFile(file);
      } else if (file.type.startsWith('video/')) {
        await handleVideoFile(file);
      } else {
        throw new Error('Please select an image or video file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      clearInput();
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [handleImageFile, handleVideoFile, setLoading, setError, clearInput]);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      if (file.type.startsWith('image/')) {
        await handleImageFile(file);
      } else if (file.type.startsWith('video/')) {
        await handleVideoFile(file);
      } else {
        throw new Error('Please drop an image or video file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      clearInput();
    } finally {
      setLoading(false);
    }
  }, [handleImageFile, handleVideoFile, setLoading, setError, clearInput]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleClearInput = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      URL.revokeObjectURL(videoRef.current.src);
      videoRef.current = null;
      setIsPlaying(false);
    }
    clearInput();
  }, [clearInput]);

  const handleVideoClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const inputWidth = useAppStore((state) => state.inputWidth);
  const inputHeight = useAppStore((state) => state.inputHeight);

  if (!panelsInput) return null;

  return (
    <div className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col shrink-0">
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border)]">
        <span className="text-sm font-medium">Input</span>
        <button 
          onClick={() => togglePanel('input')}
          className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors
            ${error 
              ? 'border-red-500 bg-red-500/10' 
              : inputSource 
                ? 'border-[var(--accent)] bg-[var(--accent)]/10' 
                : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)]'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[var(--text-secondary)]">Loading...</span>
            </div>
          ) : inputSource ? (
            <div className="flex flex-col items-center gap-2">
              {inputType === 'video' ? (
                <Video className="w-8 h-8 text-[var(--accent)]" />
              ) : (
                <ImageIcon className="w-8 h-8 text-[var(--accent)]" />
              )}
              <span className="text-sm text-[var(--text-primary)] truncate max-w-full">
                {inputFile?.name || (inputType === 'video' ? 'Video loaded' : 'Image loaded')}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {inputWidth} × {inputHeight}
              </span>
              {inputType === 'video' && (
                <span className="text-xs text-green-400">
                  {isPlaying ? '▶ Playing' : '⏸ Paused'}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                Drop image/video or click to browse
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                PNG, JPG, WebP, GIF, MP4, WebM
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Input Source Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-panel)] transition-colors disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="text-xs">Image</span>
          </button>
          
          <button
            onClick={handleVideoClick}
            disabled={isLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-panel)] transition-colors disabled:opacity-50"
          >
            <Video className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="text-xs">Video</span>
          </button>
          
          <button
            disabled
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[var(--bg-tertiary)] opacity-50 cursor-not-allowed"
            title="Webcam support coming soon"
          >
            <Camera className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="text-xs">Webcam</span>
          </button>
          
          <button
            disabled
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[var(--bg-tertiary)] opacity-50 cursor-not-allowed"
            title="GIF support coming soon"
          >
            <ImageIcon className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="text-xs">GIF</span>
          </button>
        </div>

        {inputSource && (
          <button
            onClick={handleClearInput}
            className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
          >
            Clear Input
          </button>
        )}
      </div>
    </div>
  );
}
