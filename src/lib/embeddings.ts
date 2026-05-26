import { env, hasOpenAI } from "./env";
import { openai } from "./openai";

// All embeddings (real or mock) use this fixed dimensionality. We request
// 256 dimensions from `text-embedding-3-small` (it supports the `dimensions`
// param) so storage stays cheap and the mock embedder can match the shape
// exactly. Cosine similarity is well-behaved at this size for short captions.
export const EMBED_DIM = 256;

const SIMILARITY_THRESHOLD = 0.55;

/**
 * Embed an arbitrary text into a unit vector of length EMBED_DIM.
 *
 * When OPENAI_API_KEY is configured this calls text-embedding-3-small with
 * `dimensions=EMBED_DIM`. Otherwise a deterministic hashed bag-of-words
 * embedder is used so the similarity pipeline remains demonstrable end-to-end
 * without API credentials. The mock embedder is good enough that captions
 * sharing tokens (brand names, themes, etc.) score similar to each other.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const clean = text?.trim();
  if (!clean) return null;

  if (!hasOpenAI()) {
    return mockEmbed(clean);
  }

  try {
    const res = await openai().embeddings.create({
      model: "text-embedding-3-small",
      input: clean.slice(0, 8000),
      dimensions: EMBED_DIM,
    });
    const v = res.data[0]?.embedding;
    if (!v || v.length !== EMBED_DIM) return null;
    return normalise(v);
  } catch {
    return mockEmbed(clean);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }
  // Vectors are unit-normalised at write time, so dot product is cosine.
  return Math.max(-1, Math.min(1, dot));
}

export type TopPostRef = {
  id: string;
  embedding: number[];
};

export function findBestMatch(
  embedding: number[],
  topPosts: TopPostRef[],
): { postId: string; score: number } | null {
  if (embedding.length === 0 || topPosts.length === 0) return null;
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const p of topPosts) {
    if (p.embedding.length !== embedding.length) continue;
    const s = cosineSimilarity(embedding, p.embedding);
    if (s > bestScore) {
      bestScore = s;
      bestId = p.id;
    }
  }
  if (!bestId) return null;
  // Clamp negatives to 0 so the UI never shows nonsense.
  return { postId: bestId, score: Math.max(0, bestScore) };
}

export function similarityCutoff(): number {
  return SIMILARITY_THRESHOLD;
}

// -- Mock embedder -----------------------------------------------------------

function mockEmbed(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  // Hashed bag-of-words: each token contributes to a deterministic bucket.
  // This is a poor man's TF; good enough for demoability — texts that share
  // keywords land near each other in cosine space.
  for (const t of tokens) {
    const idx = ((stableHash(t) % EMBED_DIM) + EMBED_DIM) % EMBED_DIM;
    vec[idx] += 1;
    // Also touch a few neighbouring buckets so single-token differences
    // don't blow similarity to zero.
    vec[(idx + 1) % EMBED_DIM] += 0.3;
    vec[(idx + EMBED_DIM - 1) % EMBED_DIM] += 0.3;
  }
  return normalise(vec);
}

function normalise(v: number[]): number[] {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Exposed so other code paths (e.g. the recompute route) can inspect the
// configured embedding model without importing the OpenAI client directly.
export const embeddingModel = hasOpenAI() ? "text-embedding-3-small" : "mock-hashed-bow";
export const embeddingsAvailable = hasOpenAI() || env.useMockData;
