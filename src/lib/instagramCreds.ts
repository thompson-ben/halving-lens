import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// Resolved Instagram credentials — combines values from env vars (preferred
// for production deploys, immutable per release) with operator-editable
// overrides stored in the Settings table (so the operator can paste a token
// from Graph API Explorer without redeploying Vercel).
//
// DB values take precedence so the operator's most recent in-app save wins.
export type ResolvedInstagramCreds = {
  accessToken: string;
  igBusinessAccountId: string;
  pageId: string;
  personalHandle: string;
  source: "settings" | "env" | "mixed" | "none";
};

const CACHE_TTL_MS = 30_000;
let cache: { value: ResolvedInstagramCreds; expires: number } | null = null;

export function invalidateInstagramCredsCache(): void {
  cache = null;
}

// Settings keys mirror the env var names so the resolver can transparently
// fall back between them. Keep these in one place so the settings UI and
// the loader can't drift.
export const IG_SETTINGS_KEYS = {
  accessToken: "ig_access_token_override",
  igBusinessAccountId: "ig_business_account_id_override",
  pageId: "ig_page_id_override",
  personalHandle: "ig_personal_handle",
} as const;

async function loadOverrides(): Promise<Partial<Record<keyof typeof IG_SETTINGS_KEYS, string>>> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(IG_SETTINGS_KEYS) } },
    select: { key: true, value: true },
  });
  const out: Partial<Record<keyof typeof IG_SETTINGS_KEYS, string>> = {};
  for (const r of rows) {
    const entry = Object.entries(IG_SETTINGS_KEYS).find(([, dbKey]) => dbKey === r.key);
    if (!entry) continue;
    const v = typeof r.value === "string" ? r.value : (r.value as { value?: string })?.value;
    if (typeof v === "string" && v.length > 0) {
      out[entry[0] as keyof typeof IG_SETTINGS_KEYS] = v;
    }
  }
  return out;
}

export async function getResolvedInstagramCreds(): Promise<ResolvedInstagramCreds> {
  if (cache && cache.expires > Date.now()) return cache.value;

  let overrides: Partial<Record<keyof typeof IG_SETTINGS_KEYS, string>> = {};
  try {
    overrides = await loadOverrides();
  } catch {
    // Schema may not be migrated yet, or DB unreachable — fall back to env.
  }

  const accessToken = overrides.accessToken ?? env.meta.accessToken;
  const igBusinessAccountId = overrides.igBusinessAccountId ?? env.meta.igBusinessAccountId;
  const pageId = overrides.pageId ?? env.meta.pageId;
  const personalHandle = overrides.personalHandle ?? "";

  const fromEnv = Boolean(env.meta.accessToken && env.meta.igBusinessAccountId);
  const fromSettings = Boolean(overrides.accessToken || overrides.igBusinessAccountId);
  const configured = Boolean(accessToken && igBusinessAccountId);

  const source: ResolvedInstagramCreds["source"] = !configured
    ? "none"
    : fromSettings && fromEnv
      ? "mixed"
      : fromSettings
        ? "settings"
        : "env";

  const value: ResolvedInstagramCreds = {
    accessToken,
    igBusinessAccountId,
    pageId,
    personalHandle,
    source,
  };
  cache = { value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function hasResolvedInstagramCreds(): Promise<boolean> {
  const c = await getResolvedInstagramCreds();
  return Boolean(c.accessToken && c.igBusinessAccountId);
}

// Synchronous helper that returns whatever the env vars say. Useful for
// non-critical paths where we don't want to incur a DB roundtrip — e.g.
// the legacy /settings → Instagram OAuth state check still works the same.
export function hasInstagramEnvCreds(): boolean {
  return Boolean(env.meta.accessToken && env.meta.igBusinessAccountId);
}
