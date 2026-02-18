import { useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { PresetsPanel } from './components/PresetsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Preview } from './components/Preview';
import type { PreviewExportHandle } from './components/Preview';
import { ExportModal } from './components/ExportModal';
import { useTheme } from './hooks/useTheme';
import './index.css';

function App() {
  const previewRef = useRef<PreviewExportHandle>(null);
  
  useTheme();

  // Prevent drag and drop on the whole app (except input panel)
  useEffect(() => {
    try {
      const preventDefault = (e: DragEvent) => {
        if (!(e.target as HTMLElement)?.closest('[data-drop-zone]')) {
          e.preventDefault();
        }
      };

      window.addEventListener('dragover', preventDefault);
      window.addEventListener('drop', preventDefault);

      return () => {
        window.removeEventListener('dragover', preventDefault);
        window.removeEventListener('drop', preventDefault);
      };
    } catch (err) {
      console.error('Drag/drop setup error:', err);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <Header />
      
      <main className="flex-1 flex min-h-0">
        {/* Left Sidebar - Input & Effects */}
        <div className="flex shrink-0">
          <InputPanel />
          <EffectsPanel />
        </div>

        {/* Center - Preview */}
        <Preview ref={previewRef} />

        {/* Right Sidebar - Presets & Settings */}
        <div className="flex shrink-0">
          <PresetsPanel />
          <SettingsPanel />
        </div>
      </main>

      <ExportModal
        onExportPNG={() => previewRef.current?.exportPNG() || Promise.resolve()}
        onExportVideo={(duration) => previewRef.current?.exportVideo(duration) || Promise.resolve()}
      />
    </div>
  );
}

export default App;
