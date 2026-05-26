import probe from "probe-image-size";

// IG feed aspect ratios. We classify probed images into one of these
// buckets — anything else is "other" and won't show up under the
// "IG feed-ready" filter. Tolerances are loose enough to absorb minor
// rounding from CDN-resized variants.
export const ASPECT_SQUARE = 1.0;       // 1080x1080
export const ASPECT_PORTRAIT_4_5 = 0.8; // 1080x1350
const ASPECT_TOLERANCE = 0.03;

export type AspectBucket = "square" | "portrait" | "landscape" | "vertical" | "other";

export function bucketAspect(width: number | null, height: number | null): AspectBucket {
  if (!width || !height || width <= 0 || height <= 0) return "other";
  const ratio = width / height;
  if (Math.abs(ratio - ASPECT_SQUARE) <= ASPECT_TOLERANCE) return "square";
  if (Math.abs(ratio - ASPECT_PORTRAIT_4_5) <= ASPECT_TOLERANCE) return "portrait";
  if (ratio >= 1.5) return "landscape";   // 1.91:1 IG landscape, 16:9 etc.
  if (ratio <= 0.7) return "vertical";    // 9:16 Reels-style portrait
  return "other";
}

export function isFeedReady(width: number | null, height: number | null): boolean {
  const b = bucketAspect(width, height);
  return b === "square" || b === "portrait";
}

/**
 * Probe an image URL for its pixel dimensions without downloading the
 * full file. Uses `probe-image-size` which streams just enough bytes to
 * parse the image header (typically a few KB).
 *
 * Returns null on any error — wrong content-type, timeout, network
 * failure, unsupported format. Callers should treat null as "unknown"
 * rather than "not feed-ready".
 */
export async function probeImageDimensions(url: string | null | undefined): Promise<{ width: number; height: number } | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const result = await Promise.race([
      probe(url),
      new Promise<null>((resolve) => {
        controller.signal.addEventListener("abort", () => resolve(null));
      }),
    ]);
    clearTimeout(timeout);
    if (!result || typeof result.width !== "number" || typeof result.height !== "number") return null;
    return { width: result.width, height: result.height };
  } catch {
    return null;
  }
}
