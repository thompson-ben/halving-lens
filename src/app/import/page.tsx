"use client";

import { useState } from "react";
import { Download, CheckCircle2, AlertCircle } from "lucide-react";

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [caption, setCaption] = useState("");
  const [thumb, setThumb] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          originalAuthor: author || undefined,
          caption: caption || undefined,
          thumbnailUrl: thumb || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error?.formErrors?.[0] ?? "Import failed." });
      } else if (data.duplicate) {
        setResult({ ok: false, message: "This URL has already been imported." });
      } else {
        setResult({ ok: true, message: "Imported. Visit Discovery Queue to review." });
        setUrl("");
        setAuthor("");
        setCaption("");
        setThumb("");
      }
    } catch {
      setResult({ ok: false, message: "Import failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-100">Import URL</h1>
        <p className="text-sm text-ink-300 mt-1">
          Manually add a piece of content to the discovery queue. Platform is detected from the URL; AI scoring runs
          immediately.
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label">Source URL</label>
          <input
            className="input"
            placeholder="https://instagram.com/p/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Original creator (handle)</label>
            <input
              className="input"
              placeholder="@thedrive"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Thumbnail URL (optional)</label>
            <input
              className="input"
              placeholder="https://…/image.jpg"
              value={thumb}
              onChange={(e) => setThumb(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Caption / context</label>
          <textarea
            className="input min-h-[100px]"
            placeholder="Original caption or notes"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={busy}>
            <Download className="w-4 h-4" />
            {busy ? "Importing…" : "Import to queue"}
          </button>
          {result && (
            <div className={`text-xs flex items-center gap-1.5 ${result.ok ? "text-signal-green" : "text-signal-red"}`}>
              {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result.message}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
