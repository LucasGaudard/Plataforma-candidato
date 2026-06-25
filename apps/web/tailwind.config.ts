import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Conecta Eleitor — Paleta Rosa/Magenta
        brand: {
          50:  '#fff0f7',
          100: '#ffe1ef',
          200: '#ffc7e0',
          300: '#ff9ec9',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        // Accent — Rosa claro (substituiu âmbar)
        accent: {
          50:  '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          400: '#f9a8d4',
          500: '#f472b6',
          600: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #831843 0%, #be185d 40%, #db2777 75%, #ec4899 100%)',
        'gradient-brand': 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)',
        'gradient-soft': 'linear-gradient(135deg, #fff0f7 0%, #fce7f3 100%)',
      },
      boxShadow: {
        'brand': '0 4px 24px -4px rgba(219, 39, 119, 0.3)',
        'brand-lg': '0 8px 40px -8px rgba(219, 39, 119, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;

