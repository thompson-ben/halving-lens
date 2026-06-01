// Tiny server-only Supabase helper over the PostgREST REST API — no SDK, no
// dependency. Used by the analytics, feedback and subscribe routes. Returns
// false/null gracefully when env vars are unset so nothing breaks in dev.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = !!URL && !!KEY;

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: KEY as string,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Insert a row. Returns true on success (or 409 duplicate); false otherwise.
export async function sbInsert(table: string, row: Record<string, unknown>): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const res = await fetch(`${URL}/rest/v1/${table}`, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(row),
    });
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}

// Upsert one or more rows, de-duplicating on `onConflict` columns (comma-
// separated). Used by the historical warehouse so a same-day re-run updates that
// day's row instead of creating a duplicate — append-only across days, idempotent
// within a day. Returns true on success.
export async function sbUpsert(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
  onConflict: string,
): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const res = await fetch(`${URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal,resolution=merge-duplicates" }),
      body: JSON.stringify(rows),
    });
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}

// Run a GET against PostgREST (select/aggregate). Returns parsed JSON or null.
export async function sbSelect<T = unknown>(query: string): Promise<T | null> {
  if (!supabaseConfigured) return null;
  try {
    const res = await fetch(`${URL}/rest/v1/${query}`, { headers: headers() });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Exact row count for a table with optional PostgREST filter (e.g. "name=eq.x").
export async function sbCount(table: string, filter = ""): Promise<number | null> {
  if (!supabaseConfigured) return null;
  try {
    const q = filter ? `${table}?${filter}&select=id` : `${table}?select=id`;
    const res = await fetch(`${URL}/rest/v1/${q}`, {
      headers: headers({ Prefer: "count=exact", Range: "0-0" }),
    });
    const range = res.headers.get("content-range"); // "0-0/123"
    const total = range?.split("/")?.[1];
    return total && total !== "*" ? Number(total) : 0;
  } catch {
    return null;
  }
}
