/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0D0B14",
        panel: "#17141F",
        panel2: "#201C2B",
        hairline: "#2E293A",
        paper: "#F3EFE6",
        paperDim: "#B8B3A6",
        amber: "#FFC93C",
        coral: "#FF6B4A",
        teal: "#39C3A6"
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      },
      borderRadius: {
        card: "14px"
      }
    }
  },
  plugins: []
};