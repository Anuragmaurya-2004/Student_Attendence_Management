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
        },
        accent: {
          50: '#ecfeff',
          500: '#06b6d4',
          600: '#0891b2',
        },
      },
      boxShadow: {
        soft: '0 12px 30px rgba(23, 37, 84, 0.12)',
        card: '0 8px 25px rgba(79, 70, 229, 0.12)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at top left, rgba(129,140,248,0.22), transparent 30%), radial-gradient(circle at bottom right, rgba(6,182,212,0.15), transparent 35%)',
      },
    },
  },
  plugins: [],
};
