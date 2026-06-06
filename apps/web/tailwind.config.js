/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm espresso scale for dark mode (replaces cold navy)
        navy: {
          900: '#1C1409',
          800: '#231810',
          700: '#2D200F',
          600: '#3A2815',
          500: '#4A351C',
        },
        card: {
          bg:    '#261A0D',
          border:'#3D2C18',
          hover: '#2F2210',
        },
        // Warm cream scale for light mode accents
        cream: {
          50:  '#FFFDF9',
          100: '#FBF8F4',
          200: '#F7F3EC',
          300: '#EEE5D8',
          400: '#E0D4C0',
        },
      },
      fontFamily: {
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(160deg, #1C1409 0%, #231810 45%, #2D200F 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 35%, rgba(26,14,6,0.97) 100%)',
      },
    },
  },
  plugins: [],
};
