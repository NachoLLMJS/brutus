import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark-fantasy palette mirrored from src/theme/tokens.css
        deep: 'var(--bg-deep)',
        panel: 'var(--bg-panel)',
        elevated: 'var(--bg-elevated)',
        blood: 'var(--accent-blood)',
        gold: 'var(--accent-gold)',
        rune: 'var(--accent-rune)',
        ink: 'var(--text-primary)',
        muted: 'var(--text-muted)',
        arcane: 'var(--border-arcane)',
        'hp-full': 'var(--hp-full)',
        'hp-low': 'var(--hp-low)',
      },
      fontFamily: {
        serif: ['Cinzel', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        rune: '0 0 0 1px var(--border-arcane), 0 0 18px rgba(110, 58, 170, 0.25)',
        'rune-strong': '0 0 0 1px var(--accent-rune), 0 0 24px rgba(110, 58, 170, 0.55)',
        blood: '0 0 0 1px var(--accent-blood), 0 0 18px rgba(139, 26, 43, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'rise-in': 'riseIn 280ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
