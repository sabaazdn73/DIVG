import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

// Light/Dark toggle. Dark is the default; toggling adds a `light` class to
// <html>, which the CSS override block in index.css uses to invert the theme.
// Choice persists via React state for the session (no browser storage).
export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (light) root.classList.add('light');
    else root.classList.remove('light');
  }, [light]);

  return (
    <button
      onClick={() => setLight(l => !l)}
      title={light ? 'Switch to dark' : 'Switch to light'}
      aria-label="Toggle light / dark theme"
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors shrink-0"
    >
      {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}
