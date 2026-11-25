/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F4F7F0',
          100: '#E8EEE1',
          200: '#D5E0CB',
          300: '#B9C9A8',
          400: '#94AB7E',
          500: '#718D5D',
          600: '#567347',
          700: '#405D3C',
          800: '#304A32',
          900: '#223A29',
          950: '#14271D',
        },
        emerald2: {
          400: '#90B975',
          500: '#648E4F',
          600: '#496F3D',
        },
        lime2: {
          300: '#F5E5AD',
          400: '#EAC45A',
          500: '#D9A83E',
          600: '#B9882D',
        },
        cream: {
          50: '#FAF9F2',
          100: '#F3F2E8',
          200: '#E8E7D9',
          300: '#D6D6C4',
          400: '#BEC1AA',
        },
        soil: {
          400: '#A0826D',
          500: '#8B6F5A',
          600: '#715A47',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(35, 54, 35, 0.05)',
        'card-lg': '0 12px 32px -8px rgba(35, 54, 35, 0.12)',
        'card-xl': '0 24px 60px -16px rgba(35, 54, 35, 0.18)',
        'glow': '0 0 32px -4px rgba(234, 196, 90, 0.3)',
        'map': '0 8px 32px -4px rgba(15, 23, 42, 0.20), inset 0 0 0 1px rgba(255,255,255,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'draw-line': 'drawLine 2s ease-in-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'topo': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23405A78' fill-opacity='0.04'%3E%3Cpath d='M30 30c0-5.523-4.477-10-10-10s-10 4.477-10 10 4.477 10 10 10 10-4.477 10-10zm10 0c0-5.523-4.477-10-10-10s-10 4.477-10 10 4.477 10 10 10 10-4.477 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
