"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeZip } from "@/lib/zip";

// MW2-C — the editorial selection tool, deliberately simple: click a card
// to select it, click again to deselect; SELECTION ORDER = EXPORT ORDER,
// shown as a numbered badge on each selected creative and as a reorderable
// strip above the export button. One selected card exports a PNG; several
// export an ordered ZIP (01-…, 02-… filenames so platform upload order
// matches); "Save to Photos" is the existing content packs' mechanism
// (ContentPackStudio / FindingShareKit): files pre-fetched on selection so
// navigator.share() fires synchronously inside the tap gesture (iOS
// rejects it otherwise), offered only on devices whose share sheet accepts
// image files. No text editing, no template controls, no overrides — the
// creatives are the canonical renders, untouched.

export interface PickerCard {
  metricId: string;
  label: string;
}

export interface PickerGroup {
  title: string;
  big: boolean;
  cards: PickerCard[];
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function canShareImages(): boolean {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
    const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function MetricCardPicker({ groups, period, dateSlug }: { groups: PickerGroup[]; period: number; dateSlug: string }) {
  const [selected, setSelected] = useState<string[]>([]); // metricIds, click order
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [shareable, setShareable] = useState(false);
  const labelById = useMemo(() => new Map(groups.flatMap((g) => g.cards.map((c) => [c.metricId, c.label] as const))), [groups]);

  const cardSrc = (metricId: string) => `/cards/metric/${metricId}${period === 7 ? "" : `?period=${period}`}`;
  const nameFor = (id: string, i: number, count: number) =>
    count === 1 ? `halvinglens-metric-${id}-${dateSlug}.png` : `${String(i + 1).padStart(2, "0")}-${id}.png`;

  const onToggle = (metricId: string) =>
    setSelected((s) => (s.includes(metricId) ? s.filter((x) => x !== metricId) : [...s, metricId]));

  const move = (metricId: string, dir: -1 | 1) =>
    setSelected((s) => {
      const i = s.indexOf(metricId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  useEffect(() => setShareable(canShareImages()), []);

  // Native "Save to Photos" — the existing packs' proven mechanism
  // (ContentPackStudio / FindingShareKit): the selection's files are
  // pre-fetched IN SELECTION ORDER so the share() call fires synchronously
  // inside the tap gesture (iOS rejects it otherwise). Re-runs on every
  // selection/order change; the button stays disabled until files are ready.
  const [filesReady, setFilesReady] = useState(false);
  const filesRef = useRef<File[]>([]);
  const selectedKey = selected.join(",");
  useEffect(() => {
    if (!shareable || !selected.length) {
      filesRef.current = [];
      setFilesReady(false);
      return;
    }
    let cancelled = false;
    setFilesReady(false);
    filesRef.current = [];
    (async () => {
      const files = await Promise.all(
        selected.map(async (id, i) => {
          try {
            const res = await fetch(cardSrc(id));
            if (!res.ok) return null;
            const blob = await res.blob();
            return new File([blob], nameFor(id, i, selected.length), { type: "image/png" });
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      filesRef.current = files.filter(Boolean) as File[];
      setFilesReady(filesRef.current.length === selected.length);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareable, selectedKey, period, dateSlug]);

  async function saveToPhotos() {
    const files = filesRef.current;
    if (!files.length) return;
    try {
      await navigator.share({ files, title: `halvinglens.com — Metric cards ${dateSlug}` });
    } catch {
      /* user cancelled or share unavailable — no-op */
    }
  }

  async function exportSelected() {
    if (!selected.length || busy) return;
    setBusy(true);
    setError(false);
    try {
      const out: Array<{ name: string; data: Uint8Array; blob: Blob }> = [];
      for (let i = 0; i < selected.length; i++) {
        const id = selected[i];
        const res = await fetch(cardSrc(id));
        if (!res.ok) throw new Error(`fetch ${id}`);
        const blob = await res.blob();
        out.push({ name: nameFor(id, i, selected.length), data: new Uint8Array(await blob.arrayBuffer()), blob });
      }
      if (out.length === 1) {
        saveBlob(out[0].blob, out[0].name);
      } else {
        saveBlob(makeZip(out.map((f) => ({ name: f.name, data: f.data }))), `halvinglens-metric-pack-${dateSlug}.zip`);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {groups.map((g) =>
        g.cards.length === 0 ? null : (
          <section key={g.title} aria-label={g.title}>
            <h2 className={`eyebrow mb-3 ${g.big ? "text-editorial" : "text-ink-500"}`}>{g.title}</h2>
            <div className={`grid gap-4 ${g.big ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
              {g.cards.map((c) => {
                const pos = selected.indexOf(c.metricId);
                const isSel = pos >= 0;
                // The gallery is a PICKER, not a link directory (founder
                // correction): the card itself is a select/deselect BUTTON
                // that never navigates; opening the full public card route
                // is the small ↗ chip — a SECONDARY sibling affordance, so
                // no link ever sits inside the selection tap target.
                return (
                  <div key={c.metricId} className="relative">
                    <button
                      type="button"
                      onClick={() => onToggle(c.metricId)}
                      aria-pressed={isSel}
                      className={`relative block w-full text-left rounded-lg transition-opacity ${
                        isSel ? "" : g.big ? "" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cardSrc(c.metricId)}
                        alt={`${c.label} card`}
                        className={`w-full rounded-lg border ${
                          isSel ? "border-accent ring-2 ring-accent/50" : g.big ? "border-editorial/30" : "border-white/[0.08]"
                        }`}
                        style={{ aspectRatio: "4 / 5" }}
                      />
                      {isSel && (
                        <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-accent text-black font-mono font-bold flex items-center justify-center">
                          {pos + 1}
                        </span>
                      )}
                    </button>
                    <a
                      href={cardSrc(c.metricId)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${c.label} card full size`}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-ink-400 hover:text-ink-100 flex items-center justify-center text-caption"
                    >
                      ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        ),
      )}

      {/* Selection strip + export — the whole workflow in one row */}
      <div className="sticky bottom-4 rounded-xl border border-white/[0.12] bg-[#0a0e14]/95 p-4 space-y-3">
        {selected.length > 0 ? (
          /* One row, horizontally scrollable — several selections must not
             balloon the sticky strip on a phone (founder correction). */
          <ol className="flex gap-2 overflow-x-auto pb-1">
            {selected.map((id, i) => (
              <li key={id} className="flex flex-shrink-0 items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.04] pl-3 pr-1 py-1 text-caption text-ink-100">
                <span className="font-mono text-ink-400">{i + 1}</span>
                <span className="mx-1">{labelById.get(id) ?? id}</span>
                <button type="button" aria-label={`Move ${id} earlier`} onClick={() => move(id, -1)} className="px-1 text-ink-500 hover:text-ink-100 disabled:opacity-30" disabled={i === 0}>
                  ◀
                </button>
                <button type="button" aria-label={`Move ${id} later`} onClick={() => move(id, 1)} className="px-1 text-ink-500 hover:text-ink-100 disabled:opacity-30" disabled={i === selected.length - 1}>
                  ▶
                </button>
                <button type="button" aria-label={`Deselect ${id}`} onClick={() => onToggle(id)} className="px-1 text-ink-500 hover:text-ink-100">
                  ✕
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-caption text-ink-500">Click a card to select it — selection order is the export order.</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Studio hierarchy: on devices that can save to Photos, that is
              the primary action and file export recedes to secondary. */}
          {shareable && (
            <button
              type="button"
              onClick={saveToPhotos}
              disabled={!selected.length || !filesReady}
              className="rounded-lg bg-accent text-black font-semibold px-4 py-2 disabled:opacity-40"
            >
              {selected.length && !filesReady
                ? "Preparing…"
                : selected.length > 1
                  ? `Save ${selected.length} to Photos`
                  : "Save to Photos"}
            </button>
          )}
          <button
            type="button"
            onClick={exportSelected}
            disabled={!selected.length || busy}
            className={`rounded-lg font-semibold px-4 py-2 disabled:opacity-40 ${
              shareable ? "border border-white/[0.15] text-ink-100" : "bg-accent text-black"
            }`}
          >
            {busy ? "Exporting…" : selected.length > 1 ? `Export ${selected.length} cards (ZIP)` : "Export selected"}
          </button>
          <span className="text-caption text-ink-500">
            {selected.length === 0 ? "Nothing selected" : selected.length === 1 ? "1 card → PNG" : `${selected.length} cards → ordered ZIP`}
          </span>
          {error && <span className="text-caption text-signal-red">Export failed — try again.</span>}
        </div>
        {shareable && selected.length > 0 && (
          <p className="text-micro text-ink-500">
            On iPhone, &ldquo;Save to Photos&rdquo; opens the share sheet — choose{" "}
            <span className="text-ink-300">{selected.length > 1 ? `Save ${selected.length} Images` : "Save Image"}</span> to add{" "}
            {selected.length > 1 ? "them" : "it"} straight to your photo library, in your selected order.
          </p>
        )}
        {selected.includes("etf_flows") && (
          <p className="text-micro text-editorial">
            ETF card: public/export distribution remains subject to SoSoValue licence confirmation (founder governance item).
          </p>
        )}
      </div>
    </div>
  );
}
