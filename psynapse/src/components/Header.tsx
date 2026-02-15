import { Maximize2, Minimize2, Moon, Sun, Github, Info } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function Header() {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const isFullscreen = useAppStore((state) => state.isFullscreen);
  const toggleFullscreen = useAppStore((state) => state.toggleFullscreen);

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--accent)] flex items-center justify-center">
            <span className="text-[var(--bg-primary)] font-bold text-lg">G</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Grainrad</h1>
        </div>
        <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
          WebGPU-powered effects
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <Maximize2 className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          title="View on GitHub"
        >
          <Github className="w-5 h-5 text-[var(--text-secondary)]" />
        </a>

        <button
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          title="About"
        >
          <Info className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
      </div>
    </header>
  );
}
