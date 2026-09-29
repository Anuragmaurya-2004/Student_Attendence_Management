/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#4f46e5',
          600: '#4338ca',
          700: '#3730a3',
          800: '#312e81',
          900: '#1e1b4b',
          950: '#0f0e26',
        },
        accent: {
          50: '#ecfeff',
          500: '#06b6d4',
          600: '#0891b2',
        },
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 10px 30px -4px rgba(0, 0, 0, 0.04)',
        card: '0 10px 30px -5px rgba(15, 23, 42, 0.06)',
        glow: '0 0 25px -4px rgba(79, 70, 229, 0.28)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      animation: {
        fadeInUp: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        pulseSubtle: 'pulseSubtle 2.5s infinite ease-in-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at top left, rgba(129,140,248,0.22), transparent 30%), radial-gradient(circle at bottom right, rgba(6,182,212,0.15), transparent 35%)',
      },
    },
  },
  plugins: [],
};
