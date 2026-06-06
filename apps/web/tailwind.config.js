/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Periwinkle / cool blue-gray scale — dark mode
        navy: {
          900: '#0D1117',
          800: '#0F1420',
          700: '#161B2E',
          600: '#1E2640',
          500: '#2A3354',
        },
        card: {
          bg:    '#141929',
          border:'#1E2640',
          hover: '#1A2035',
        },
        // Cool lavender-white scale — light mode
        cream: {
          50:  '#F5F7FF',
          100: '#EEF1FF',
          200: '#E1E5F7',
          300: '#CDD3EF',
          400: '#B4BCE6',
        },
        // Periwinkle accent
        peri: {
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
        },
      },
      fontFamily: {
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(160deg, #0D1117 0%, #0F1420 45%, #161B2E 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 35%, rgba(13,17,23,0.97) 100%)',
      },
    },
  },
  plugins: [],
};
