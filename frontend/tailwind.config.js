module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#0a0e27',
        'primary-light': '#1a1f3a',
        'accent-green': '#00d084',
        'accent-light': '#00f5a0',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'border-color': '#2d3748',
        'chart-up': '#00d084',
        'chart-down': '#ff4757',
      },
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
  },
  plugins: [],
};
