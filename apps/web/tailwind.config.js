/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#050B18',
          800: '#0A1628',
          700: '#0D1F3C',
          600: '#122647',
          500: '#1A3255',
        },
        card: {
          bg: '#0D1626',
          border: '#1E2D45',
          hover: '#152035',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #050B18 0%, #0A1628 40%, #0D1F3C 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 40%, rgba(5,11,24,0.95) 100%)',
      },
    },
  },
  plugins: [],
};
