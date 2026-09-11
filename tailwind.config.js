/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        panel2: "rgb(var(--color-panel2) / <alpha-value>)",
        hairline: "rgb(var(--color-hairline) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        paperDim: "rgb(var(--color-paperDim) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        teal: "rgb(var(--color-teal) / <alpha-value>)"
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