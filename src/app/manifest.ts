import type { MetadataRoute } from "next";

// PWA web app manifest. Dark brand ground, standalone display, and the Aperture
// mark in every size an installed app needs (SVG for crisp scaling, plus
// maskable PNGs for Android launchers).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HalvingLens",
    short_name: "HalvingLens",
    description: "The clearest view of the Bitcoin cycle — historical context, not prediction.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070a",
    theme_color: "#05070a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/manifest-icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/manifest-icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/manifest-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
