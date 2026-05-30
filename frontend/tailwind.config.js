/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme  : {
    extend: {
      colors: {
        // Sui Overflow 2026 palette
        bg     : '#FFFFFF',
        panel  : '#F8FAFC',
        border : '#E2E8F0',
        ink    : '#0F172A',
        muted  : '#64748B',
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
        sans : ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono : ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
