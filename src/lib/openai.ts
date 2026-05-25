import OpenAI from "openai";
import { env, hasOpenAI } from "./env";

let _client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!hasOpenAI()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return _client;
}

export type CaptionBundle = {
  shortText: string;
  luxuryText: string;
  questionText: string;
  hashtags: string[];
  creditLine: string;
};

/**
 * Generate a four-variant caption bundle for a discovered piece of content.
 *
 * Falls back to a deterministic template if OPENAI_API_KEY is not configured,
 * so the UI flow remains demonstrable without credentials.
 */
export async function generateCaptionBundle(input: {
  carMake?: string | null;
  carModel?: string | null;
  originalAuthor?: string | null;
  rawCaption?: string | null;
}): Promise<CaptionBundle> {
  const credit = input.originalAuthor ? `📷 ${input.originalAuthor}` : "📷 Original creator";

  if (!hasOpenAI()) {
    return templateBundle(input, credit);
  }

  const sys = `You are a senior social media copywriter for a luxury supercar Instagram account.
Write tight, premium copy. Never use AI clichés. Never invent technical specs you can't verify.
Return strict JSON matching the schema. No code fences.`;

  const user = `Source post: ${input.rawCaption ?? "(no caption)"}
Car: ${input.carMake ?? "unknown"} ${input.carModel ?? ""}
Original author: ${input.originalAuthor ?? "unknown"}

Produce four caption variants and a hashtag set:
- shortText: under 80 characters, punchy
- luxuryText: 1-2 sentences, premium tone, evocative
- questionText: ends with an engagement question to drive comments
- hashtags: 8-12 relevant, mix of broad and niche, lowercase, no spaces
- creditLine: e.g. "📷 @handle" — credit the original creator

Schema:
{ "shortText": string, "luxuryText": string, "questionText": string, "hashtags": string[], "creditLine": string }`;

  try {
    const res = await openai().chat.completions.create({
      model: env.openaiModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    const text = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as Partial<CaptionBundle>;
    return {
      shortText: parsed.shortText ?? templateBundle(input, credit).shortText,
      luxuryText: parsed.luxuryText ?? templateBundle(input, credit).luxuryText,
      questionText: parsed.questionText ?? templateBundle(input, credit).questionText,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : templateBundle(input, credit).hashtags,
      creditLine: parsed.creditLine ?? credit,
    };
  } catch {
    return templateBundle(input, credit);
  }
}

function templateBundle(
  input: { carMake?: string | null; carModel?: string | null },
  credit: string,
): CaptionBundle {
  const make = input.carMake ?? "Supercar";
  const model = input.carModel ?? "";
  const tag = `${make} ${model}`.trim();
  const slug = tag.toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    shortText: `${tag}. No words needed.`,
    luxuryText: `${tag} — engineered for those who measure success in horsepower and patience.`,
    questionText: `${tag} — would you spec it in red, silver, or something nobody else has?`,
    hashtags: [
      `#${slug}`,
      `#${(input.carMake ?? "supercar").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      "#supercar",
      "#carsofinstagram",
      "#luxurycars",
      "#carporn",
      "#automotive",
      "#dreamcar",
      "#carlifestyle",
      "#exoticcars",
    ],
    creditLine: credit,
  };
}

/**
 * Score a piece of content for repost-worthiness (0-100).
 * The simple deterministic fallback is good enough for first launch and means
 * the queue is always populated with scores.
 */
export async function scoreContentWithAI(input: {
  caption?: string | null;
  carMake?: string | null;
  carModel?: string | null;
  platform: string;
  engagement: { likes?: number | null; comments?: number | null; views?: number | null };
}): Promise<{ score: number; reason: string }> {
  if (!hasOpenAI()) {
    return heuristicScore(input);
  }

  const sys = `You rate supercar/luxury car posts for repost-worthiness for a curated Instagram account.
Be honest and concise. Return strict JSON: {"score": number 0-100, "reason": string (<= 240 chars)}.`;
  const user = `Platform: ${input.platform}
Car: ${input.carMake ?? "unknown"} ${input.carModel ?? ""}
Caption: ${input.caption ?? "(none)"}
Engagement: likes=${input.engagement.likes ?? "?"}, comments=${input.engagement.comments ?? "?"}, views=${input.engagement.views ?? "?"}

Penalise: heavy watermarks, low-effort meme overlays, clearly stolen content with no credit, brands outside luxury/supercar scope.
Reward: clean compositions, rare cars, official manufacturer or credible automotive media sources, strong engagement-to-reach ratios.`;

  try {
    const res = await openai().chat.completions.create({
      model: env.openaiModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { score?: number; reason?: string };
    if (typeof parsed.score === "number") {
      return { score: Math.max(0, Math.min(100, parsed.score)), reason: parsed.reason ?? "" };
    }
  } catch {
    /* fall through to heuristic */
  }
  return heuristicScore(input);
}

function heuristicScore(input: {
  caption?: string | null;
  carMake?: string | null;
  platform: string;
  engagement: { likes?: number | null; comments?: number | null; views?: number | null };
}): { score: number; reason: string } {
  let score = 50;
  const reasons: string[] = [];

  const premiumBrands = ["Ferrari", "Lamborghini", "Porsche", "Bugatti", "Pagani", "McLaren", "Aston Martin", "Rolls-Royce"];
  if (input.carMake && premiumBrands.includes(input.carMake)) {
    score += 15;
    reasons.push("premium brand match");
  }

  const likes = input.engagement.likes ?? 0;
  if (likes > 100_000) {
    score += 20;
    reasons.push("strong engagement");
  } else if (likes > 10_000) {
    score += 10;
    reasons.push("solid engagement");
  }

  if (input.platform === "instagram" || input.platform === "tiktok") {
    score += 5;
    reasons.push("native format");
  }

  if (input.caption && input.caption.length > 40) {
    score += 5;
    reasons.push("descriptive caption");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: reasons.length ? `Heuristic score (${reasons.join(", ")}).` : "Baseline heuristic score.",
  };
}
