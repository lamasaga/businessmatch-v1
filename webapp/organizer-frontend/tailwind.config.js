/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        'background-secondary': '#111113',
        'background-card': '#141416',
        'background-hover': '#1c1c1f',
        foreground: '#f2f0eb',
        'foreground-muted': '#8a8a92',
        'foreground-secondary': '#b4b4be',
        primary: {
          DEFAULT: '#d4a853',
          soft: 'rgba(212,168,83,0.12)',
        },
        success: '#2dd4a0',
        warning: '#f59e0b',
        danger: '#f87171',
        border: { subtle: 'rgba(255,255,255,0.055)' },
        'ops-primary': {
          DEFAULT: '#3b82f6',
          soft: 'rgba(59,130,246,0.12)',
        },
        'ops-auction': '#f59e0b',
        'tv-primary': { DEFAULT: '#a855f7', soft: 'rgba(168,85,247,0.12)' },
        'tv-tech': '#3b82f6',
        'tv-user': '#22c55e',
        'tv-brand': '#ec4899',
        'tv-pathfinder': '#eab308',
      },
    },
  },
  plugins: [],
};
