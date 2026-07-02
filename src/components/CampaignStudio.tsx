"use client";

import { useState } from "react";
import { Copy, Check, Download, Plus, ArrowUpRight, QrCode } from "lucide-react";
import { track } from "@/lib/track";
import { SITE_HOST } from "@/lib/site";

export interface DestOption {
  label: string;
  path: string;
}
export interface CampaignRow {
  slug: string;
  name: string;
  destination: string;
  scans: number;
  visits: number;
  subscribers: number;
  conversionPct: number | null;
}

// Founder-only campaign creator. Name it, pick a destination, generate — and
// instantly get a branded short URL + QR to put on a card, a slide or a stand.
export function CampaignStudio({
  options,
  initial,
  adminKey,
}: {
  options: DestOption[];
  initial: CampaignRow[];
  adminKey?: string;
}) {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState(options[0]?.path ?? "/");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CampaignRow[]>(initial);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the campaign a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), destination, slug: slug.trim() || undefined, key: adminKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(errorText(data.error));
        return;
      }
      track("campaign_create", { slug: data.campaign.slug });
      setRows((r) => [
        { slug: data.campaign.slug, name: data.campaign.name, destination: data.campaign.destination_path, scans: 0, visits: 0, subscribers: 0, conversionPct: null },
        ...r,
      ]);
      setName("");
      setSlug("");
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Create */}
      <form onSubmit={submit} className="card p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Campaign name">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Norfolk Networking Event"
              className="w-full h-11 px-3.5 rounded-lg bg-white/[0.03] border border-white/[0.1] text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40"
            />
          </Field>
          <Field label="Destination page">
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-[14px] text-ink-100 focus:outline-none focus:border-accent/40"
            >
              {options.map((o) => (
                <option key={o.path} value={o.path} className="bg-[#0d1016]">{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <Field label="Custom short code (optional)">
            <div className="flex items-center h-11 rounded-lg bg-white/[0.03] border border-white/[0.1] focus-within:border-accent/40">
              <span className="pl-3.5 pr-1 text-[13px] text-ink-500 font-mono whitespace-nowrap">{SITE_HOST}/r/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="business-card"
                className="flex-1 min-w-0 h-full pr-3 bg-transparent text-[13px] text-ink-100 font-mono placeholder:text-ink-500 focus:outline-none"
              />
            </div>
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
          >
            <Plus size={16} /> {busy ? "Generating…" : "Generate campaign link"}
          </button>
        </div>
        {error && <p className="text-[12.5px] text-signal-red">{error}</p>}
        <p className="text-[11.5px] text-ink-500">Leave the short code blank to auto-generate one from the name. Every scan and signup is attributed to this campaign.</p>
      </form>

      {/* Existing campaigns */}
      {rows.length === 0 ? (
        <p className="text-[13px] text-ink-500">No campaigns yet. Create one above — then put its QR on a business card, a slide or an exhibition stand.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((c) => (
            <CampaignCard key={c.slug} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ c }: { c: CampaignRow }) {
  const [copied, setCopied] = useState(false);
  const link = `${SITE_HOST}/r/${c.slug}`;
  const qr = `/api/qr?slug=${encodeURIComponent(c.slug)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="card p-5 flex gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt={`QR for ${c.name}`} width={110} height={132} className="w-[110px] h-auto rounded-lg shrink-0 self-start" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-ink-50 truncate">{c.name}</div>
        <a href={`/r/${c.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-0.5 text-[12px] text-accent font-mono hover:text-accent-soft">
          {link} <ArrowUpRight size={12} />
        </a>
        <div className="mt-1 text-[11px] text-ink-500 truncate">→ {c.destination}</div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <Stat label="Scans" value={c.scans} icon />
          <Stat label="Visits" value={c.visits} />
          <Stat label="Subs" value={c.subscribers} />
          <Stat label="Conv." value={c.conversionPct != null ? `${c.conversionPct}%` : "—"} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={copy} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.1] text-[11.5px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={`${qr}&caption=${encodeURIComponent(link)}`}
            download={`halvinglens-${c.slug}.svg`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.1] text-[11.5px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
          >
            <Download size={12} /> QR
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] py-2">
      <div className="font-mono text-[15px] text-ink-50 tabular-nums flex items-center justify-center gap-1">
        {icon && <QrCode size={11} className="text-ink-500" />}{value}
      </div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-ink-500 mt-0.5">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function errorText(code: string): string {
  switch (code) {
    case "taken": return "That short code is already in use — pick another.";
    case "reserved": return "That short code is reserved for a page link.";
    case "invalid": return "Use only lowercase letters, numbers and hyphens.";
    case "empty": return "Give the campaign a name.";
    default: return "Couldn't create the campaign — try again.";
  }
}
