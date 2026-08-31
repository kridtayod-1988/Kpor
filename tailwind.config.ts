import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f0f2f8",
        surface: "#ffffff",
        border: "#e5e7eb",
        indigo: { DEFAULT: "#4f46e5", dark: "#4338ca" },
        teal: "#0f766e",
        purple: "#6d28d9",
        amber: "#b45309",
        green: "#16a34a",
        red: "#dc2626",
      },
      fontFamily: {
        sarabun: ["Sarabun", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 4px 14px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04)",
        cardLg: "0 12px 32px rgba(0,0,0,.11), 0 2px 6px rgba(0,0,0,.05)",
      },
    },
  },
  plugins: [],
};
export default config;
