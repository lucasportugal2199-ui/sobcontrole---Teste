/** @type {import('tailwindcss').Config} */
// Antes carregado do CDN (cdn.tailwindcss.com) no index.html, o que deixava o app
// sem estilo quando aberto sem internet. Agora o CSS é gerado no build.
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './constants.ts',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './i18n/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Light Mode
        'light-bg': '#F1F5F9',
        'light-card': '#FFFFFF',
        'light-card-elevated': '#FFFFFF',
        'light-border': '#D7E0EB',
        'light-text': '#172033',
        'light-text-secondary': '#475569',
        'light-text-muted': '#64748B',
        'light-accent': '#EA580C',
        'light-accent-hover': '#F97316',
        'light-accent-subtle': '#FFEDD5',
        'light-selected': '#FFEDD5',

        // Dark Mode — OLED Black
        'dark-bg': '#050505',
        'dark-card': '#111111',
        'dark-elevated': '#1A1A1A',
        'dark-surface': '#1F1F1F',
        'dark-border': '#1F1F1F',
        'dark-text': '#F5F5F5',
        'dark-text-secondary': '#B0B0B0',
        'dark-text-muted': '#666666',
        'dark-accent': '#EA580C',
        'dark-accent-hover': '#F97316',
        'dark-accent-subtle': '#431407',

        // Acentos da Marca
        'brand-accent': '#EA580C',
        'brand-accent-hover': '#F97316',
        'brand-accent-dark-subtle': '#431407',
        'brand-accent-light-subtle': '#FFEDD5',

        // Semantic Finanças
        'fin-income': '#10B981',
        'fin-expense': '#EF4444',
        'fin-info': '#EA580C',
        'fin-warning': '#F59E0B',
        'fin-invest': '#8B5CF6',
        'fin-action': '#EA580C',
      },
    },
  },
  plugins: [],
};
