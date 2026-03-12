import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0f1117',
          raised: '#161821',
          overlay: '#1c1f2b',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.14)',
        },
        accent: {
          DEFAULT: '#818cf8',
          hover: '#a5b4fc',
          muted: 'rgba(129, 140, 248, 0.15)',
          glow: 'rgba(129, 140, 248, 0.25)',
        },
        danger: {
          DEFAULT: '#f87171',
          hover: '#fca5a5',
          muted: 'rgba(248, 113, 113, 0.15)',
        },
        success: {
          DEFAULT: '#34d399',
          muted: 'rgba(52, 211, 153, 0.15)',
        },
        text: {
          primary: '#e8eaed',
          secondary: 'rgba(232, 234, 237, 0.55)',
          tertiary: 'rgba(232, 234, 237, 0.32)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
