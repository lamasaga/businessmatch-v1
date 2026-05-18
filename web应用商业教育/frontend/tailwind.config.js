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
        background: '#0f172a',
        'background-secondary': '#1e293b',
        'background-card': '#1e293b',
        'background-hover': '#334155',
        foreground: '#f8fafc',
        'foreground-muted': '#94a3b8',
        'foreground-secondary': '#cbd5e1',
        primary: {
          DEFAULT: '#6366f1',
          soft: 'rgba(99,102,241,0.15)',
          glow: 'rgba(99,102,241,0.4)',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        border: {
          subtle: 'rgba(148,163,184,0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
