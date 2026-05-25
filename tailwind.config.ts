import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Premium dark palette — Linear / modern trading dashboard feel.
        ink: {
          950: "#070809",
          900: "#0b0d10",
          850: "#101317",
          800: "#14181d",
          700: "#1b2128",
          600: "#242c35",
          500: "#3a4654",
          400: "#5b6877",
          300: "#8a96a4",
          200: "#b8c1cc",
          100: "#e6eaef",
        },
        accent: {
          DEFAULT: "#d4af37", // luxury gold
          soft: "#e9c96a",
          deep: "#9d7f1f",
        },
        signal: {
          green: "#3ddc97",
          red: "#ff5d5d",
          amber: "#f0b429",
          blue: "#5aa9ff",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(212,175,55,0.18), 0 8px 30px rgba(0,0,0,0.4)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
