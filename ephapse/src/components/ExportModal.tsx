import { useState, useEffect, useCallback } from 'react';
import { Download, X, Loader2, Video, Image } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { isAnimatedEffect } from '../utils/export';

interface ExportModalProps {
  onExportPNG: () => Promise<void>;
  onExportVideo: (duration: number) => Promise<void>;
}

export function ExportModal({ onExportPNG, onExportVideo }: ExportModalProps) {
  const showExportModal = useAppStore((state) => state.showExportModal);
  const setShowExportModal = useAppStore((state) => state.setShowExportModal);
  const activeEffect = useAppStore((state) => state.activeEffect);
  const inputSource = useAppStore((state) => state.inputSource);

  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'png' | 'video'>('png');
  const [videoDuration, setVideoDuration] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const isAnimated = isAnimatedEffect(activeEffect);

  useEffect(() => {
    if (!isAnimated && exportType === 'video') {
      setExportType('png');
    }
  }, [isAnimated, exportType]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      if (exportType === 'png') {
        await onExportPNG();
      } else {
        await onExportVideo(videoDuration);
      }
      setShowExportModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [exportType, videoDuration, onExportPNG, onExportVideo, setShowExportModal]);

  if (!showExportModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isExporting && setShowExportModal(false)}
      />

      <div className="relative bg-[var(--bg-secondary)] rounded-lg shadow-xl w-full max-w-md mx-4 border border-[var(--border)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">Export</h2>
          <button
            onClick={() => setShowExportModal(false)}
            disabled={isExporting}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!inputSource && (
            <div className="text-sm text-[var(--text-secondary)] p-3 bg-[var(--bg-tertiary)] rounded">
              Load an image first to export
            </div>
          )}

          {inputSource && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportType('png')}
                    disabled={isExporting}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      exportType === 'png'
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <Image className="w-4 h-4" />
                    <span>PNG</span>
                  </button>

                  {isAnimated && (
                    <button
                      onClick={() => setExportType('video')}
                      disabled={isExporting}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                        exportType === 'video'
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-[var(--border)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>Video</span>
                    </button>
                  )}
                </div>
                {isAnimated && exportType === 'png' && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Tip: This effect is animated. Export as video to capture the animation.
                  </p>
                )}
              </div>

              {exportType === 'video' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration: {videoDuration}s</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(Number(e.target.value))}
                    disabled={isExporting}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>1s</span>
                    <span>30s</span>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="text-sm text-red-400 p-2 bg-red-400/10 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
          <button
            onClick={() => setShowExportModal(false)}
            disabled={isExporting}
            className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !inputSource}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
