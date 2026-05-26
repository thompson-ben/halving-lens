"use client";

import { useEffect, useState } from "react";
import { Instagram, AlertCircle, Check, Save, Shield } from "lucide-react";

type Source = { id: string; platform: string; label: string; enabled: boolean };
type Settings = Record<string, unknown>;

export default function SettingsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [igState, setIgState] = useState<{ configured: boolean; connected: boolean; authUrl?: string; message?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  function update<K extends string>(key: K, value: unknown) {
    setSettings((cur) => ({ ...cur, [key]: value }));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-100">Settings</h1>
        <p className="text-sm text-ink-300 mt-1">Configure sources, posting behaviour and Instagram connection.</p>
      </div>

      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Instagram className="w-4 h-4 text-accent" />
          <h2 className="text-base font-semibold text-ink-100">Instagram connection</h2>
        </div>
        {!igState ? (
          <div className="text-sm text-ink-300">Loading…</div>
        ) : igState.connected ? (
          <div className="flex items-center gap-2 text-sm text-signal-green">
            <Check className="w-4 h-4" /> Connected. Use the &quot;Sync IG&quot; button up top to refresh historical posts.
          </div>
        ) : igState.configured ? (
          <div className="flex items-center gap-3">
            <a href={igState.authUrl} className="btn-primary">
              Connect Instagram Business Account
            </a>
            <span className="text-xs text-ink-300">
              Requires an IG Business account linked to a Facebook Page.
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-signal-amber">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>
              {igState.message ?? "Instagram credentials not configured."}
              <div className="mt-1 text-ink-300">
                See <code className="text-accent">META_API_SETUP.md</code> for the step-by-step guide.
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-ink-100 mb-1">Content sources</h2>
        <p className="text-xs text-ink-300 mb-4">Toggle which connectors the discovery engine pulls from.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sources.map((s) => (
            <label
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-4 py-3 cursor-pointer hover:border-ink-600"
            >
              <div>
                <div className="text-sm text-ink-100">{s.label}</div>
                <div className="text-[11px] text-ink-400">{s.platform}</div>
              </div>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => toggleSource(s.id, e.target.checked)}
                className="w-4 h-4 accent-[#d4af37]"
              />
            </label>
          ))}
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
