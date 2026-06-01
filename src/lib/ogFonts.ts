// Brand fonts for server-rendered images (next/og / Satori). Loads the TTF
// binaries via import.meta.url — the Vercel-supported pattern that gets the
// files traced into the deployment. Memoised so the fonts are read once per
// server instance, not per render.
//
// Inter (sans) for body/metrics; Fraunces (serif display) for headlines — the
// "financial publication" pairing used across the content pack cards.
// next/og doesn't export its options type, so describe the font shape we need.
type FontList = Array<{
  name: string;
  data: ArrayBuffer;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: "normal" | "italic";
}>;

async function buf(file: string): Promise<ArrayBuffer> {
  return fetch(new URL(`./fonts/${file}`, import.meta.url)).then((r) => r.arrayBuffer());
}

let cache: Promise<FontList> | null = null;

export function brandFonts(): Promise<FontList> {
  if (!cache) {
    cache = (async () => {
      const [i400, i600, i700, f600, f700] = await Promise.all([
        buf("inter-400.ttf"),
        buf("inter-600.ttf"),
        buf("inter-700.ttf"),
        buf("fraunces-600.ttf"),
        buf("fraunces-700.ttf"),
      ]);
      return [
        { name: "Inter", data: i400, weight: 400, style: "normal" },
        { name: "Inter", data: i600, weight: 600, style: "normal" },
        { name: "Inter", data: i700, weight: 700, style: "normal" },
        { name: "Fraunces", data: f600, weight: 600, style: "normal" },
        { name: "Fraunces", data: f700, weight: 700, style: "normal" },
      ] as FontList;
    })();
  }
  return cache;
}
