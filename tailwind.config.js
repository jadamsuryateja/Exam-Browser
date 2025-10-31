/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        blob: "blob 7s infinite",
        'scroll-x': 'scroll-x 20s linear infinite',
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        'scroll-x': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      colors: {
        dark: {
          background: '#000000',
          surface: '#121212',
          'surface-2': '#1a1a1a',
          border: '#1e1e1e',
        }
      },
      transitionProperty: {
        'colors': 'background-color, border-color',
      },
      transitionDuration: {
        '200': '200ms',
      },
    },
  },
  plugins: [],
}
