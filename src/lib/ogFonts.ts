// Brand fonts for server-rendered images (next/og / Satori). Reads the bundled
// TTF binaries with fs (the files are traced into the deployment via the
// import.meta.url reference below). We do NOT use fetch(file://…) — Node's fetch
// rejects file URLs, which previously broke every card.
//
// Fail-safe: if a font can't be read for any reason, returns [] so the card
// still renders (system font) instead of 500-ing. Success is memoised; failures
// are never cached (so a transient issue can't poison every later render).
//
// Inter (sans) for body/metrics; Fraunces (serif display) for headlines.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type FontList = Array<{
  name: string;
  data: Buffer;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: "normal" | "italic";
}>;

function read(file: string): Buffer {
  return readFileSync(fileURLToPath(new URL(`./fonts/${file}`, import.meta.url)));
}

let cache: FontList | null = null;

export function brandFonts(): FontList {
  if (cache) return cache;
  try {
    const fonts: FontList = [
      { name: "Inter", data: read("inter-400.ttf"), weight: 400, style: "normal" },
      { name: "Inter", data: read("inter-600.ttf"), weight: 600, style: "normal" },
      { name: "Inter", data: read("inter-700.ttf"), weight: 700, style: "normal" },
      { name: "Fraunces", data: read("fraunces-600.ttf"), weight: 600, style: "normal" },
      { name: "Fraunces", data: read("fraunces-700.ttf"), weight: 700, style: "normal" },
    ];
    cache = fonts; // memoise only on success
    return fonts;
  } catch {
    return []; // render with system fonts rather than fail
  }
}
