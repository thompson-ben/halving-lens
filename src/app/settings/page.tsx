"use client";

import { useEffect, useState } from "react";
import { Instagram, AlertCircle, Check, Save, Shield, Dna, Wand2, Crop } from "lucide-react";

type Source = { id: string; platform: string; label: string; enabled: boolean };
type Settings = Record<string, unknown>;

// Sources we treat as "primary" in the IG-first UI. Everything else is
// surfaced under a secondary collapsed group so the operator can still
// toggle them on without code changes.
const PRIMARY_SOURCE_PLATFORMS = new Set(["instagram", "manual"]);

export default function SettingsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [igState, setIgState] = useState<{
    configured: boolean;
    connected: boolean;
    authUrl?: string;
    message?: string;
    source?: "settings" | "env" | "mixed" | "none";
    personalHandle?: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);
  const [dryRunMsg, setDryRunMsg] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sources").then((r) => r.json()).then((d) => setSources(d.sources));
    fetch("/api/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
    fetch("/api/instagram/connect").then((r) => r.json()).then(setIgState);
  }, []);

  async function toggleSource(id: string, enabled: boolean) {
    setSources((cur) => cur.map((s) => (s.id === id ? { ...s, enabled } : s)));
    await fetch("/api/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
  }

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function recomputeDna() {
    setRecomputing(true);
    setRecomputeMsg(null);
    try {
      const res = await fetch("/api/dna/recompute", { method: "POST" });
      const data = await res.json();
      setRecomputeMsg(
        `Recomputed in ${data.durationMs}ms — ${data.topPerformerCount} top performers, ${data.contentScored} items scored (${data.model}).`,
      );
    } catch {
      setRecomputeMsg("Recompute failed.");
    } finally {
      setRecomputing(false);
    }
  }

  function update<K extends string>(key: K, value: unknown) {
    setSettings((cur) => ({ ...cur, [key]: value }));
  }

  async function backfillDimensions() {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const res = await fetch("/api/content/backfill-dimensions?limit=200", { method: "POST" });
      const data = await res.json();
      setBackfillMsg(
        `Probed ${data.probed}: ${data.succeeded} succeeded, ${data.failed} failed. ${data.remaining} still pending — run again if needed.`,
      );
    } catch {
      setBackfillMsg("Backfill failed.");
    } finally {
      setBackfilling(false);
    }
  }

  async function previewAutoShortlist() {
    setPreviewing(true);
    setDryRunMsg(null);
    try {
      // Save current settings first so the preview uses what's on screen.
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const res = await fetch("/api/picks/auto-shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      setDryRunMsg(
        `Would shortlist ${data.shortlisted}/${data.candidatesEvaluated} candidates at threshold ${data.threshold}.`,
      );
    } catch {
      setDryRunMsg("Preview failed.");
    } finally {
      setPreviewing(false);
    }
  }

  const primarySources = sources.filter((s) => PRIMARY_SOURCE_PLATFORMS.has(s.platform));
  const secondarySources = sources.filter((s) => !PRIMARY_SOURCE_PLATFORMS.has(s.platform));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-100">Settings</h1>
        <p className="text-sm text-ink-300 mt-1">Configure sources, posting behaviour and Instagram connection.</p>
      </div>

      <InstagramConnectionCard igState={igState} />


      <section className="card p-6">
        <h2 className="text-base font-semibold text-ink-100 mb-1">Content sources</h2>
        <p className="text-xs text-ink-300 mb-4">
          Currently focused on Instagram. Other connectors stay wired up — toggle them on below when you&apos;re ready.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {primarySources.map((s) => (
            <SourceToggle key={s.id} source={s} onToggle={toggleSource} />
          ))}
        </div>

        {secondarySources.length > 0 && (
          <div className="mt-5 pt-5 border-t border-ink-700">
            <button
              onClick={() => setShowSecondary((v) => !v)}
              className="text-xs text-ink-300 hover:text-ink-100 mb-3"
            >
              {showSecondary ? "▾" : "▸"} Other connectors (paused, {secondarySources.length})
            </button>
            {showSecondary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-70">
                {secondarySources.map((s) => (
                  <SourceToggle key={s.id} source={s} onToggle={toggleSource} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-accent" />
          <h2 className="text-base font-semibold text-ink-100">Content DNA</h2>
        </div>
        <p className="text-xs text-ink-300">
          Recompute caption embeddings + similarity scores against your top-performing historical posts. Safe to re-run — idempotent.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={recomputeDna} className="btn-secondary text-xs" disabled={recomputing}>
            <Dna className="w-3.5 h-3.5" /> {recomputing ? "Recomputing…" : "Recompute Content DNA"}
          </button>
          {recomputeMsg && <span className="text-[11px] text-ink-400">{recomputeMsg}</span>}
        </div>
      </section>

      <section className="card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Crop className="w-4 h-4 text-accent" />
          <h2 className="text-base font-semibold text-ink-100">Image dimensions</h2>
        </div>
        <p className="text-xs text-ink-300">
          Probes the source image of every discovered item to record pixel dimensions, so the aspect-ratio filter
          (1:1 square, 4:5 portrait, IG feed-ready) can pick them up. New items get probed on ingest — use this for
          backfilling anything imported before this feature shipped.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={backfillDimensions} className="btn-secondary text-xs" disabled={backfilling}>
            <Crop className="w-3.5 h-3.5" /> {backfilling ? "Probing…" : "Backfill missing dimensions"}
          </button>
          {backfillMsg && <span className="text-[11px] text-ink-400">{backfillMsg}</span>}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-accent" />
          <h2 className="text-base font-semibold text-ink-100">Automation</h2>
        </div>
        <p className="text-xs text-ink-300">
          Auto-shortlist promotes newly-discovered items from <code>new</code> to <code>shortlisted</code> when their
          composite score (DNA + AI quality + recency + source engagement, with brand-cooldown penalty) exceeds the
          threshold. Runs after each favourites scan. Today&apos;s Picks then shows only items that need your judgement.
        </p>

        <label className="flex items-start justify-between gap-4 rounded-lg border border-ink-700 bg-ink-850 px-4 py-3">
          <div>
            <div className="text-sm text-ink-100">Auto-shortlist enabled</div>
            <div className="text-[11px] text-ink-400 mt-1">
              Off by default. Turn on once you trust the scoring on your content mix.
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(settings.auto_shortlist_enabled)}
            onChange={(e) => update("auto_shortlist_enabled", e.target.checked)}
            className="w-4 h-4 accent-[#d4af37] mt-1"
          />
        </label>

        <div className="rounded-lg border border-ink-700 bg-ink-850 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-ink-100">
              Composite threshold: <span className="text-accent tabular-nums">{Number(settings.auto_shortlist_threshold ?? 75)}</span>
            </label>
            <div className="text-[11px] text-ink-400">Range 0–100</div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Number(settings.auto_shortlist_threshold ?? 75)}
            onChange={(e) => update("auto_shortlist_threshold", Number(e.target.value))}
            className="w-full accent-[#d4af37]"
          />
          <div className="text-[11px] text-ink-400">
            Lower threshold = more auto-shortlists. Recommended starting point: 75.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={previewAutoShortlist} className="btn-secondary text-xs" disabled={previewing}>
            <Wand2 className="w-3.5 h-3.5" /> {previewing ? "Previewing…" : "Preview at current threshold"}
          </button>
          <button onClick={saveSettings} className="btn-primary text-xs" disabled={saving}>
            <Save className="w-3.5 h-3.5" /> Save automation
          </button>
          {dryRunMsg && <span className="text-[11px] text-ink-400">{dryRunMsg}</span>}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink-100 mb-1">Posting workflow</h2>

        <label className="flex items-start justify-between gap-4 rounded-lg border border-ink-700 bg-ink-850 px-4 py-3">
          <div>
            <div className="text-sm text-ink-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" /> Auto-post mode
            </div>
            <div className="text-[11px] text-ink-400 mt-1">
              When enabled, scheduled posts publish automatically. Off by default for account safety.
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(settings.auto_post_enabled)}
            onChange={(e) => update("auto_post_enabled", e.target.checked)}
            className="w-4 h-4 accent-[#d4af37] mt-1"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Default caption style</label>
            <select
              className="input"
              value={String(settings.default_caption_style ?? "luxury")}
              onChange={(e) => update("default_caption_style", e.target.value)}
            >
              <option value="short">Short</option>
              <option value="luxury">Luxury</option>
              <option value="question">Question</option>
            </select>
          </div>
          <div>
            <label className="label">Min quality score</label>
            <input
              type="number"
              className="input"
              value={Number(settings.min_quality_score ?? 65)}
              onChange={(e) => update("min_quality_score", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Repost cooldown (days)</label>
            <input
              type="number"
              className="input"
              value={Number(settings.repost_cooldown_days ?? 30)}
              onChange={(e) => update("repost_cooldown_days", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveSettings} className="btn-primary" disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="text-xs text-signal-green">Saved.</span>}
        </div>
      </section>
    </div>
  );
}

function SourceToggle({ source, onToggle }: { source: Source; onToggle: (id: string, enabled: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-4 py-3 cursor-pointer hover:border-ink-600">
      <div>
        <div className="text-sm text-ink-100">{source.label}</div>
        <div className="text-[11px] text-ink-400">{source.platform}</div>
      </div>
      <input
        type="checkbox"
        checked={source.enabled}
        onChange={(e) => onToggle(source.id, e.target.checked)}
        className="w-4 h-4 accent-[#d4af37]"
      />
    </label>
  );
}

type IGState = {
  configured: boolean;
  connected: boolean;
  authUrl?: string;
  message?: string;
  source?: "settings" | "env" | "mixed" | "none";
  personalHandle?: string | null;
};

function InstagramConnectionCard({ igState }: { igState: IGState | null }) {
  const [handle, setHandle] = useState("");
  const [token, setToken] = useState("");
  const [igAcctId, setIgAcctId] = useState("");
  const [pageId, setPageId] = useState("");
  const [tokenMasked, setTokenMasked] = useState("");
  const [savedSource, setSavedSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: true; username: string; followers?: number | null; mediaCount?: number | null }
    | { ok: false; message: string }
    | null
  >(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    fetch("/api/instagram/manual-token")
      .then((r) => r.json())
      .then((d) => {
        setHandle(d.personalHandle ?? "");
        setIgAcctId(d.igBusinessAccountId ?? "");
        setPageId(d.pageId ?? "");
        setTokenMasked(d.accessTokenMasked ?? "");
        setSavedSource(d.source ?? null);
      });
  }, []);

  async function saveHandle() {
    setBusy(true);
    try {
      await fetch("/api/instagram/manual-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalHandle: handle }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveToken() {
    if (!token || !igAcctId) return;
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/instagram/manual-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          igBusinessAccountId: igAcctId,
          pageId: pageId || undefined,
          personalHandle: handle || undefined,
        }),
      });
      if (res.ok) {
        setToken("");
        // Re-pull to refresh the masked display + source.
        const d = await fetch("/api/instagram/manual-token").then((r) => r.json());
        setTokenMasked(d.accessTokenMasked ?? "");
        setSavedSource(d.source ?? null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function clearOverrides() {
    if (!confirm("Remove the in-app token/account overrides and fall back to env vars?")) return;
    setBusy(true);
    try {
      await fetch("/api/instagram/manual-token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: ["accessToken", "igBusinessAccountId", "pageId"] }),
      });
      setIgAcctId("");
      setPageId("");
      setTokenMasked("");
      setSavedSource("none");
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/instagram/test", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, username: data.username, followers: data.followers, mediaCount: data.mediaCount });
      } else {
        setTestResult({ ok: false, message: data.message ?? "Test failed." });
      }
    } finally {
      setBusy(false);
    }
  }

  const connected = Boolean(igState?.connected);

  return (
    <section className="card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Instagram className="w-4 h-4 text-accent" />
        <h2 className="text-base font-semibold text-ink-100">Instagram connection</h2>
        {savedSource && savedSource !== "none" && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-400">
            source: {savedSource}
          </span>
        )}
      </div>

      <div>
        <label className="label">Your Instagram handle</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">@</span>
            <input
              className="input pl-7"
              placeholder="VIPWHIPS"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@+/, ""))}
            />
          </div>
          <button onClick={saveHandle} className="btn-secondary text-xs" disabled={busy}>
            <Save className="w-3.5 h-3.5" /> Save handle
          </button>
        </div>
        <div className="text-[11px] text-ink-400 mt-1">
          Display only — used to label &quot;your account&quot; in the UI. Doesn&apos;t give the app access until you also connect below.
        </div>
      </div>

      {connected ? (
        <div className="rounded-lg border border-signal-green/40 bg-signal-green/5 p-3 text-sm text-signal-green flex items-center gap-2">
          <Check className="w-4 h-4" />
          Connected{handle ? ` as @${handle}` : ""}. Use the &quot;Sync IG&quot; button up top to refresh historical posts.
        </div>
      ) : (
        <div className="rounded-lg border border-signal-amber/30 bg-signal-amber/5 p-3 text-sm text-signal-amber flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div>
            Not connected yet. Two options:
            <ul className="list-disc list-inside text-ink-300 mt-1 space-y-1">
              <li>
                <span className="text-ink-100">OAuth flow</span> — requires <code className="text-accent">META_APP_ID</code>,{" "}
                <code className="text-accent">META_APP_SECRET</code>, <code className="text-accent">META_REDIRECT_URI</code> in env. Walks you through Facebook Login.
              </li>
              <li>
                <span className="text-ink-100">Paste token</span> — get a long-lived token from{" "}
                <a
                  className="text-accent hover:underline"
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Graph API Explorer
                </a>{" "}
                and paste it below. No redeploy needed.
              </li>
            </ul>
            <div className="mt-1 text-ink-300">
              Full setup walkthrough in <code className="text-accent">META_API_SETUP.md</code>.
            </div>
          </div>
        </div>
      )}

      {igState?.configured && igState?.authUrl && (
        <div>
          <a href={igState.authUrl} className="btn-primary">
            <Instagram className="w-4 h-4" /> Connect via OAuth
          </a>
        </div>
      )}

      <div className="border-t border-ink-700 pt-5">
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className="text-sm font-medium text-ink-100 hover:text-accent flex items-center gap-2"
        >
          {advancedOpen ? "▾" : "▸"} Paste credentials manually
        </button>
        {advancedOpen && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="label">IG Business Account ID</label>
              <input
                className="input"
                placeholder="178414XXXXXXXXX"
                value={igAcctId}
                onChange={(e) => setIgAcctId(e.target.value.trim())}
              />
            </div>
            <div>
              <label className="label">Facebook Page ID (optional)</label>
              <input
                className="input"
                placeholder="for publishing flows"
                value={pageId}
                onChange={(e) => setPageId(e.target.value.trim())}
              />
            </div>
            <div>
              <label className="label">Long-lived access token</label>
              <input
                type="password"
                className="input font-mono"
                placeholder={tokenMasked ? `current: ${tokenMasked}` : "paste a 60-day token"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="text-[11px] text-ink-400 mt-1">
                Stored in the Settings table. Leave blank to keep the existing token while you change other fields.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={saveToken} className="btn-primary text-xs" disabled={busy || (!token && !igAcctId)}>
                <Save className="w-3.5 h-3.5" /> Save credentials
              </button>
              <button onClick={testConnection} className="btn-secondary text-xs" disabled={busy}>
                <Instagram className="w-3.5 h-3.5" /> Test connection
              </button>
              {tokenMasked && (
                <button onClick={clearOverrides} className="btn-ghost text-xs" disabled={busy}>
                  <AlertCircle className="w-3.5 h-3.5" /> Clear overrides
                </button>
              )}
            </div>
            {testResult && (
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  testResult.ok
                    ? "border-signal-green/40 bg-signal-green/5 text-signal-green"
                    : "border-signal-red/40 bg-signal-red/5 text-signal-red"
                }`}
              >
                {testResult.ok ? (
                  <>
                    <Check className="inline w-3.5 h-3.5 mr-1" />
                    Connected as <span className="font-semibold">@{testResult.username}</span> · {testResult.followers?.toLocaleString() ?? "?"} followers · {testResult.mediaCount ?? "?"} posts.
                  </>
                ) : (
                  <>
                    <AlertCircle className="inline w-3.5 h-3.5 mr-1" />
                    {testResult.message}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
