/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light, lavender-tinted palette
        canvas: "#f7f5fc", // app background
        surface: "#ffffff", // panels, cards
        subtle: "#f3f0fa", // hover, inputs, chips
        line: "#e9e4f3", // borders
        "line-strong": "#d9d1ea",
        ink: "#1a1530", // primary text
        "ink-2": "#4b4565", // secondary text
        muted: "#7a7491", // tertiary text
        faint: "#aaa4bf", // placeholders
        brand: {
          50: "#f4f1ff",
          100: "#ebe5ff",
          200: "#d9ceff",
          300: "#bba6ff",
          400: "#9b7bff",
          500: "#7c55fb",
          600: "#6a3ef0",
          700: "#5a2fd6",
          800: "#4a27ad",
          900: "#2e1a6e",
        },
        blush: {
          50: "#fdf2f8",
          100: "#fce7f3",
          500: "#e0479e",
          600: "#c92f86",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        doc: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "Cambria", "serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(26 21 48 / 0.04), 0 6px 20px -10px rgb(74 39 173 / 0.18)",
        pop: "0 2px 4px rgb(26 21 48 / 0.04), 0 18px 40px -14px rgb(74 39 173 / 0.35)",
        paper: "0 1px 3px rgb(26 21 48 / 0.06), 0 24px 60px -20px rgb(74 39 173 / 0.28)",
        glow: "0 8px 20px -8px rgb(106 62 240 / 0.65)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease-out both",
        "pop-in": "pop-in 0.16s ease-out both",
      },
    },
  },
  plugins: [],
};
