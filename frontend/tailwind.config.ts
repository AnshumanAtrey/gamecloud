import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // GameCloud command-console palette
        ink: '#070a10',
        panel: '#0d1320',
        panel2: '#121a2b',
        line: '#1e293b',
        accent: '#6366f1',   // indigo
        accent2: '#22d3ee',  // cyan
        good: '#34d399',     // emerald
        warn: '#fbbf24',     // amber
        bad: '#f87171',      // red
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
