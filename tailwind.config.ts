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
        // The HalvingLens editorial colour (SB6a). Structure only: act
        // numerals, eyebrows, the glance rail, bridges, active states.
        // Never on a link, never on a data value — teal owns interaction
        // and the signal colours own data direction.
        editorial: "#d9b96a",
      },
      // The editorial type scale (SB6a) — the only text sizes the State of
      // Bitcoin tree may use. Six prose steps plus one stat size for large
      // tabular figures; the display step is fluid so headings need no
      // per-breakpoint arbitrary values.
      fontSize: {
        micro: ["10.5px", { lineHeight: "1.4" }],
        caption: ["12px", { lineHeight: "1.5" }],
        body: ["14px", { lineHeight: "1.6" }],
        subhead: ["15px", { lineHeight: "1.4" }],
        headline: ["22px", { lineHeight: "1.25" }],
        stat: ["27px", { lineHeight: "1.1" }],
        display: ["clamp(34px, 4.5vw, 54px)", { lineHeight: "1.05" }],
      },
      maxWidth: {
        // One reading measure for all running prose (~66ch at body size).
        measure: "68ch",
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
