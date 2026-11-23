/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light & clean palette
        canvas: "#f6f6f4", // app background
        surface: "#ffffff", // panels, cards
        subtle: "#f1f1ef", // hover, inputs, chips
        line: "#e6e6e3", // borders
        "line-strong": "#d6d6d2",
        ink: "#1c1c1f", // primary text
        "ink-2": "#4a4a52", // secondary text
        muted: "#76767f", // tertiary text
        faint: "#a3a3ab", // placeholders
        brand: {
          50: "#f3f0ff",
          100: "#e9e3ff",
          200: "#d4c9ff",
          500: "#7c5cf5",
          600: "#6a43ee",
          700: "#5833d6",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "Cambria", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 16 20 / 0.04), 0 1px 3px rgb(16 16 20 / 0.06)",
        pop: "0 4px 12px -2px rgb(16 16 20 / 0.08), 0 2px 4px -2px rgb(16 16 20 / 0.05)",
        paper: "0 1px 3px rgb(16 16 20 / 0.06), 0 12px 32px -8px rgb(16 16 20 / 0.12)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};
