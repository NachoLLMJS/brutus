import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brutus dark fantasy palette (from src/theme/tokens.css)
        // Mantenemos aliases legacy (cream, durazno, deep, etc.) para no
        // romper componentes que ya los usan; las CSS vars están redefinidas.
        deep: 'var(--bg-default)',
        panel: 'var(--paper)',
        elevated: 'var(--paper-accent)',
        paper: 'var(--paper)',
        'paper-dark': 'var(--paper-dark)',
        'paper-accent': 'var(--paper-accent)',
        cream: 'var(--bg-light)',
        durazno: 'var(--bg-default)',
        // Acentos
        blood: 'var(--accent-blood)',
        gold: 'var(--accent-gold)',
        rune: 'var(--accent-rune)',
        // Texto
        ink: 'var(--text-primary)',
        'ink-strong': 'var(--text-strong)',
        muted: 'var(--text-secondary)',
        // Bordes
        arcane: 'var(--border-shadow)',
        'border-shadow': 'var(--border-shadow)',
        'border-inner': 'var(--border-inner)',
        'border-main': 'var(--border-main)',
        'border-outer': 'var(--border-outer)',
        // Stat bars
        'hp-full': 'var(--hp-full)',
        'hp-mid': 'var(--hp-mid)',
        'hp-low': 'var(--hp-low)',
        // Surfaces específicas
        tooltip: 'var(--surface-tooltip)',
      },
      fontFamily: {
        display: ['MedievalSharp', 'LaBrute', 'AcmeSa', 'Georgia', 'serif'],
        serif: ['MedievalSharp', 'AcmeSa', 'LaBrute', 'Georgia', 'serif'],
        sans: ['Inter', 'AcmeSa', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        // Aliases reinterpretados para dark fantasy: glow + drop sutil.
        rune: '0 0 0 1px var(--border-outer), 0 0 12px rgba(95, 176, 74, 0.25)',
        'rune-strong': '0 0 0 2px var(--border-outer), 0 0 18px rgba(95, 176, 74, 0.4)',
        blood: '0 0 0 1px var(--accent-blood), 0 0 22px rgba(196, 26, 26, 0.55)',
        gold: '0 0 0 1px var(--accent-gold), 0 0 18px rgba(230, 180, 80, 0.45)',
        paper: '0 0 0 1px var(--border-outer) inset, 0 0 12px rgba(0, 0, 0, 0.55)',
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
