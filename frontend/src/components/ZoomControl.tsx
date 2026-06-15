import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Search } from 'lucide-react';

// Compact zoom control, top-right. Collapsed to a single round button that
// expands its +/-/reset controls outward from the corner on hover.
// Scales the whole app via CSS zoom; 1.0 is the default design size.
const MIN = 0.7;
const MAX = 1.3;
const STEP = 0.1;

export default function ZoomControl({ onZoom }: { onZoom: (z: number) => void }) {
  // On phones the UI fits best around 70%; default there and let users adjust.
  const [zoom, setZoom] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 0.7 : 1
  );
  const [open, setOpen] = useState(false);

  useEffect(() => { onZoom(zoom); }, [zoom, onZoom]);

  const set = (z: number) => setZoom(Math.round(Math.min(MAX, Math.max(MIN, z)) * 10) / 10);

  return (
    <div className="fixed top-16 sm:top-20 right-3 sm:right-4 z-[55]"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {open ? (
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-[#1C1633]/95 backdrop-blur-md shadow-xl px-1.5 py-1">
          <button onClick={() => set(zoom - STEP)} disabled={zoom <= MIN} title="Zoom out"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 disabled:opacity-30 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => set(1)} title="Reset zoom"
            className="min-w-[2.8rem] px-1 text-xs mono text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors">
            {zoom !== 1 && <RotateCcw className="w-3 h-3" />}{Math.round(zoom * 100)}%
          </button>
          <button onClick={() => set(zoom + STEP)} disabled={zoom >= MAX} title="Zoom in"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 disabled:opacity-30 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} title="Zoom"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1633]/95 border border-white/15 text-gray-300 hover:text-white hover:bg-white/10 transition-colors shadow-xl backdrop-blur-md">
          <Search className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
