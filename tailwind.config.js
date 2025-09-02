/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        purdueGold: "#CEB888",
        themeBlue: {
          100: "#2d3748",
          200: "#1a202c",
        },
        warmWhite: "#fafaf9",
      },
    },
  },
  plugins: [],
};
