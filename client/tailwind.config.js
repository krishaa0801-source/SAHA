/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Same tokens as index.html / account.html tailwind.config
        primary: '#5f2859',
        'primary-container': '#7A3F72',
        'deep-aubergine': '#3D1A38',
        secondary: '#C9A36B',
        'secondary-fixed': '#efe0cd',
        'on-secondary-fixed': '#453c2e',
        'soft-sand': '#efe0cd',
        'golden-beige': '#fdd397',
        surface: '#3D1A38',
        'on-surface': '#efe0cd',
        'on-surface-variant': '#EADBC8',
        'on-primary': '#efe0cd',
        error: '#C0455A',
      },
      fontFamily: {
        aptos: ['Hanken Grotesk', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        script: ['Great Vibes', 'cursive'],
      },
    },
  },
  plugins: [],
};
