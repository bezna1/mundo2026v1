import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fff9e7',
          100: '#fff0bd',
          200: '#f7dc8d',
          300: '#f4d47c',
          400: '#e4c069',
          500: '#d6b25e',
          600: '#b58f43',
          700: '#8f6b2f',
        },
        navy: {
          900: '#030914',
          800: '#06111f',
          700: '#091a2d',
          600: '#0c2239',
          500: '#102b47',
          400: '#16395d',
          300: '#214b78',
          200: '#315f92',
        },
        accent: {
          blue: '#2c7dff',
          green: '#17a580',
          red: '#ef4444',
          orange: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px rgba(245, 184, 0, 0.2)' },
          to: { boxShadow: '0 0 30px rgba(245, 184, 0, 0.6)' },
        },
      },
      boxShadow: {
        'gold': '0 0 24px rgba(244, 212, 124, 0.22)',
        'gold-lg': '0 0 48px rgba(244, 212, 124, 0.3)',
        'blue': '0 0 24px rgba(44, 125, 255, 0.28)',
        'green': '0 0 24px rgba(23, 165, 128, 0.28)',
        'glass': '0 18px 56px rgba(0, 0, 0, 0.34)',
        'glass-lg': '0 24px 80px rgba(0, 0, 0, 0.42)',
        'premium': '0 24px 80px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config
