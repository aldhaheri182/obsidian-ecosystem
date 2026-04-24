import type { Config } from 'tailwindcss';

// Palette strictly from docs/COMMAND_CENTER.md §5 + docs/ui/CINEMATIC_SPEC.md.
const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        'void-black': '#0A0A0F',
        'abyss-blue': '#121624',
        verdigris: '#4ECDC4',
        ember: '#FF6B35',
        'crimson-forge': '#E63946',
        'solar-gold': '#FFD166',
        'lunar-silver': '#E0E0E0',
        'ghost-white': '#F8F9FA',
        'deep-amethyst': '#7209B7',
        'cyan-aurora': '#00F5D4',
        'ash-grey': '#6C757D',
        'panel-border': '#2A2A3E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        ceremonial: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
