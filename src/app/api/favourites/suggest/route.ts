import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env, hasOpenAI } from "@/lib/env";
import { openai } from "@/lib/openai";

export const dynamic = "force-dynamic";

type Suggestion = {
  handle: string;
  displayName: string;
  reason: string;
  tags: string[];
};

const MOCK_POOL: Suggestion[] = [
  { handle: "ferrari", displayName: "Ferrari", reason: "Brand-official feed. Cleanest rights story for Italian supercar content.", tags: ["italian-supercars", "ferrari", "brand-official"] },
  { handle: "lamborghini", displayName: "Lamborghini", reason: "Brand-official. Heavy on hypercar launches and motorsport.", tags: ["italian-supercars", "lamborghini", "brand-official"] },
  { handle: "paganiautomobili", displayName: "Pagani Automobili", reason: "Brand-official Pagani feed. Rare, high-engagement posts.", tags: ["italian-supercars", "pagani", "brand-official"] },
  { handle: "koenigsegg", displayName: "Koenigsegg", reason: "Brand-official. Hypercar launches with extreme engineering depth.", tags: ["hypercar", "koenigsegg", "brand-official"] },
  { handle: "porsche", displayName: "Porsche", reason: "Brand-official. Strong cross-segment coverage from GT3 to Taycan.", tags: ["porsche", "brand-official", "lifestyle"] },
  { handle: "mclarenauto", displayName: "McLaren Automotive", reason: "Brand-official. Best-in-class launch coverage and Artura/750S content.", tags: ["mclaren", "brand-official", "hypercar"] },
  { handle: "bugatti", displayName: "Bugatti", reason: "Brand-official Bugatti. Chiron / Tourbillon launches drive massive engagement.", tags: ["hypercar", "bugatti", "brand-official"] },
  { handle: "supercar.fanatics", displayName: "Supercar Fanatics", reason: "Aggregator with daily multi-brand posts and POV reels.", tags: ["aggregator", "reels", "lifestyle"] },
  { handle: "carthrottle", displayName: "Car Throttle", reason: "Editorial-style aggregator. Mixes humour with launch coverage.", tags: ["aggregator", "editorial"] },
  { handle: "wheels", displayName: "Wheels", reason: "Lifestyle-leaning supercar coverage with a younger audience skew.", tags: ["aggregator", "lifestyle"] },
];

export async function POST() {
  const existing = await prisma.favouriteAccount.findMany({
    select: { handle: true, displayName: true, tags: true, followersCount: true, active: true },
  });
  const existingSet = new Set(existing.map((e) => e.handle.toLowerCase()));

  let suggestions: Suggestion[] = [];

  if (hasOpenAI() && !env.useMockData) {
    suggestions = await llmSuggest(existing);
  }

  // Fallback: pad / replace with the curated pool so the UI always has
  // something to show. The pool is filtered to exclude anything the
  // operator already follows.
  if (suggestions.length === 0) {
    suggestions = MOCK_POOL;
  }

  const filtered = suggestions.filter((s) => !existingSet.has(s.handle.toLowerCase())).slice(0, 8);

  return NextResponse.json({
    items: filtered,
    source: hasOpenAI() && !env.useMockData ? "llm" : "curated",
  });
}

async function llmSuggest(existing: { handle: string; tags: string[] }[]): Promise<Suggestion[]> {
  const handleList = existing.map((e) => `@${e.handle} (${e.tags.join(", ") || "no tags"})`).join("\n");

  const sys = `You suggest Instagram accounts to follow for a luxury supercar content team.
Return ONLY accounts you are confident exist and are active on Instagram.
Never invent handles. Skip personal accounts of private individuals.
Return strict JSON: { "items": [{ "handle": string, "displayName": string, "reason": string (<= 140 chars), "tags": string[] }] }.`;

  const user = `The team already follows these Instagram accounts (with the tags they assigned):
${handleList || "(none yet)"}

Suggest 8 additional Instagram accounts the team should consider following. Focus on:
- Brand-official supercar / hypercar accounts (Ferrari, Lamborghini, Pagani, McLaren, Bugatti, Koenigsegg, Porsche, Rolls-Royce, Bentley, Aston Martin, etc.)
- High-quality curators and aggregators with strong original photography
- Niche specialists (track day, restomod, JDM, classic Ferrari, etc.) that align with the team's existing tags
Avoid duplicates of accounts already followed.
Give each suggestion 2-4 lowercase, kebab-case tags.`;

  try {
    const res = await openai().chat.completions.create({
      model: env.openaiModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });
    const text = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as { items?: Suggestion[] };
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items
      .filter((s) => s && typeof s.handle === "string" && s.handle.length > 0)
      .map((s) => ({
        handle: s.handle.replace(/^@+/, "").toLowerCase().trim(),
        displayName: s.displayName || s.handle,
        reason: s.reason || "Suggested by the model.",
        tags: Array.isArray(s.tags) ? s.tags.map((t) => String(t).toLowerCase()) : [],
      }));
  } catch {
    return [];
  }
}
