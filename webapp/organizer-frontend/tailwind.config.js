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
      },
    },
  },
  plugins: [],
};
