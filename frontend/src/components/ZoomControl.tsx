import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Floating zoom control. Scales the whole app via CSS zoom on a wrapper, so a
// user who finds the (intentionally large) UI too big can shrink it, or enlarge
// it further. Steps between 0.7 and 1.3; 1.0 is the default design size.
const MIN = 0.7;
const MAX = 1.3;
const STEP = 0.1;

export default function ZoomControl({ onZoom }: { onZoom: (z: number) => void }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => { onZoom(zoom); }, [zoom, onZoom]);

  const set = (z: number) => setZoom(Math.round(Math.min(MAX, Math.max(MIN, z)) * 10) / 10);

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-1 rounded-full border border-white/15 bg-[#1C1633]/90 backdrop-blur-md px-1.5 py-1 shadow-xl">
      <button onClick={() => set(zoom - STEP)} disabled={zoom <= MIN}
        title="Zoom out"
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 disabled:opacity-30 transition-colors">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button onClick={() => set(1)} title="Reset zoom"
        className="min-w-[3rem] px-1 text-xs mono text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors">
        {zoom !== 1 && <RotateCcw className="w-3 h-3" />}{Math.round(zoom * 100)}%
      </button>
      <button onClick={() => set(zoom + STEP)} disabled={zoom >= MAX}
        title="Zoom in"
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 disabled:opacity-30 transition-colors">
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
}
