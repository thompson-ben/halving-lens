import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Premium dark palette — chain-native trading dashboard feel.
        ink: {
          950: "#05070a",
          900: "#090c11",
          850: "#0e1218",
          800: "#12171e",
          700: "#1a2129",
          600: "#232c37",
          500: "#384353",
          400: "#586475",
          300: "#8893a4",
          200: "#b6c0cd",
          100: "#e4e9f0",
        },
        accent: {
          DEFAULT: "#5eead4",
          soft: "#99f6e4",
          deep: "#0d9488",
        },
        signal: {
          green: "#3ddc97",
          red: "#ff5d5d",
          amber: "#f5b942",
          blue: "#5aa9ff",
          violet: "#a78bfa",
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
        glow: "0 0 0 1px rgba(94,234,212,0.20), 0 8px 30px rgba(0,0,0,0.45)",
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
