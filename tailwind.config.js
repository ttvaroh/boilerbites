/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        purdueGold: "#CEB888",
        purdueBlack: {
          100: "#1a1a1a",
          200: "#0d0d0d",
          300: "#000000",
        },
        warmWhite: "#fafaf9",
      },
    },
  },
  plugins: [],
};
