/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0b0d12",
        surface: "#12151c",
        raised: "#1a1e28",
        line: "#272c38",
        "line-strong": "#363c4b",
        muted: "#8f97aa",
        faint: "#5d6476",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "Cambria", "serif"],
      },
      boxShadow: {
        paper: "0 1px 2px rgb(0 0 0 / 0.3), 0 24px 48px -12px rgb(0 0 0 / 0.6)",
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
