import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Charcoal + navy base. Restrained accents.
        ink: {
          975: "#030507",
          950: "#05070a",
          925: "#070a0e",
          900: "#090c11",
          875: "#0b0f15",
          850: "#0d1219",
          800: "#11171f",
          750: "#161d25",
          700: "#1b232c",
          650: "#212a35",
          600: "#28323f",
          550: "#34404e",
          500: "#404d5d",
          400: "#5a6677",
          350: "#6f7c8e",
          300: "#8893a4",
          250: "#a3adbb",
          200: "#bfc7d2",
          150: "#d6dce4",
          100: "#e4e9f0",
          50: "#f1f4f8",
        },
        accent: {
          DEFAULT: "#5eead4",
          soft: "#99f6e4",
          deep: "#0d9488",
          muted: "#4ac4af",
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
        display: [
          "var(--font-fraunces)",
          "ui-serif",
          "Iowan Old Style",
          "Apple Garamond",
          "Baskerville",
          "Times New Roman",
          "serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
        "tight-2": "-0.02em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94,234,212,0.18), 0 12px 36px rgba(0,0,0,0.5)",
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 28px rgba(0,0,0,0.40)",
        elev: "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 40px rgba(0,0,0,0.45)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
