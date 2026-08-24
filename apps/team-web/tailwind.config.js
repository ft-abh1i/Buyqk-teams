/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#030d1a',
          900: '#081C3A',
          850: '#0b2545',
          800: '#134074',
          700: '#1d4ed8'
        },
        gold: {
          500: '#FFC107',
          400: '#ffca28',
          600: '#ffb300'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
        'gold-glow': '0 4px 20px -2px rgba(255, 193, 7, 0.15)',
      }
    },
  },
  plugins: [],
}
