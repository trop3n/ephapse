import { useEffect } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Preview } from './components/Preview';
import { useTheme } from './hooks/useTheme';
import './index.css';

function App() {
  // Initialize theme
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
        <Preview />

        {/* Right Sidebar - Settings */}
        <SettingsPanel />
      </main>
    </div>
  );
}

export default App;
