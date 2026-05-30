import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: "#00f5ff",
          pink: "#ff006e",
          green: "#00ff88",
          yellow: "#ffbe0b",
          purple: "#8338ec",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-neon": "pulseNeon 2s infinite",
        "winner-pop": "winnerPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseNeon: {
          "0%, 100%": { textShadow: "0 0 10px #00f5ff, 0 0 20px #00f5ff" },
          "50%": { textShadow: "0 0 20px #00f5ff, 0 0 40px #00f5ff, 0 0 60px #00f5ff" },
        },
        winnerPop: {
          "0%": { opacity: "0", transform: "scale(0.5) translateY(-20px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
