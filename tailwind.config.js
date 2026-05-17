/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B3A6B',
          50: '#E8EEF7',
          100: '#C5D3EC',
          200: '#8FA8D4',
          300: '#597CBC',
          400: '#3560A8',
          500: '#1B3A6B',
          600: '#163060',
          700: '#112655',
          800: '#0C1B3F',
          900: '#07102A',
        },
        gold: {
          DEFAULT: '#C8A94A',
          50: '#FAF5E8',
          100: '#F3E8C5',
          200: '#E6D08B',
          300: '#D9B851',
          400: '#C8A94A',
          500: '#B8973E',
          600: '#A38535',
          700: '#8E722C',
          800: '#796023',
          900: '#644E1A',
        },
        surface: '#F8F9FC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
