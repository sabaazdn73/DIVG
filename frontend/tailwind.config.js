/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme  : {
    extend: {
      colors: {
        // Sui Overflow 2026 palette
        // DIVG warm-dark palette (legible, not pure black)
        bg     : '#141026',
        panel  : '#1C1633',
        border : '#2A2347',
        ink    : '#F1F5F9',
        muted  : '#94A3B8',
        // Layer colors
        firm   : '#0F6E56',
        claim  : '#0284C7',
        pool   : '#64748B',
        val    : '#2563EB',
        vic    : '#7C3AED',
        hedera : '#16A34A',
        invest : '#4F46E5',
      },
      fontFamily: {
        sans  : ['Inter', 'sans-serif'],
        pixel: ['VT323', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
