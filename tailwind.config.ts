import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#1e1f22',
          panel: '#2b2d30',
          border: '#393b40',
          text: '#a9b7c6',
          keyword: '#cc7832',
          string: '#6a8759',
          number: '#6897bb',
          function: '#ffc66d',
          comment: '#808080',
          selection: '#2e436e',
          activeTab: '#4e5254',
          hover: '#35373c'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
} satisfies Config;
