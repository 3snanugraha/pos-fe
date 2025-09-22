/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF', // Blue-700
        secondary: '#3B82F6', // Blue-500
        accent: '#60A5FA', // Blue-400
        background: '#F3F4F6', // Gray-100
      },
    },
  },
  plugins: [],
}