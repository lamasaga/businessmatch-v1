/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
          glow: 'rgba(212,168,83,0.35)',
        },
        success: '#2dd4a0',
        warning: '#f59e0b',
        danger: '#f87171',
        info: '#60a5fa',
        border: {
          subtle: 'rgba(255,255,255,0.055)',
        },
        accent: {
          teal: '#2dd4a0',
          rose: '#f43f5e',
          gold: '#d4a853',
        },
        // Engine-specific themes
        'ops-primary': {
          DEFAULT: '#3b82f6',
          soft: 'rgba(59,130,246,0.12)',
          glow: 'rgba(59,130,246,0.35)',
        },
        'ops-auction': '#f59e0b',
        'tv-primary': {
          DEFAULT: '#a855f7',
          soft: 'rgba(168,85,247,0.12)',
          glow: 'rgba(168,85,247,0.35)',
        },
        'tv-tech': '#3b82f6',
        'tv-user': '#22c55e',
        'tv-brand': '#ec4899',
        'tv-pathfinder': '#eab308',
        'trading-bg': '#0d181f',
        'trading-primary': '#d4a853',
        'trading-teal': '#5a9aa8',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
