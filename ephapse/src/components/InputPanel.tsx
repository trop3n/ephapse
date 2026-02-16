import { Upload, Camera, Image as ImageIcon, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useRef, useCallback } from 'react';
import { createImageBitmapFromFile } from '../utils/webgpu';

export function InputPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Individual selectors
  const inputSource = useAppStore((state) => state.inputSource);
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

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file (PNG, JPG, WebP, etc.)');
      }

      setInputFile(file);
      const imageBitmap = await createImageBitmapFromFile(file);
      
      setInput(
        'image',
        imageBitmap,
        imageBitmap.width,
        imageBitmap.height
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
      clearInput();
    } finally {
      setLoading(false);
    }
  }, [setInput, setInputFile, setLoading, setError, clearInput]);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please drop an image file (PNG, JPG, WebP, etc.)');
      }

      setInputFile(file);
      const imageBitmap = await createImageBitmapFromFile(file);
      
      setInput(
        'image',
        imageBitmap,
        imageBitmap.width,
        imageBitmap.height
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
      clearInput();
    } finally {
      setLoading(false);
    }
  }, [setInput, setInputFile, setLoading, setError, clearInput]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

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
            accept="image/*"
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
              <ImageIcon className="w-8 h-8 text-[var(--accent)]" />
              <span className="text-sm text-[var(--text-primary)] truncate max-w-full">
                {inputFile?.name || 'Image loaded'}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {inputSource.width} × {inputSource.height}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                Drop image or click to browse
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                PNG, JPG, WebP, GIF
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
            disabled
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[var(--bg-tertiary)] opacity-50 cursor-not-allowed"
            title="Video support coming soon"
          >
            <Upload className="w-5 h-5 text-[var(--text-secondary)]" />
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
            onClick={clearInput}
            className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
          >
            Clear Input
          </button>
        )}
      </div>
    </div>
  );
}
