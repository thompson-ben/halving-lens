import Link from "next/link";

// A subtle, power-user entry point into presenter (record) mode. Presenter mode
// is otherwise URL-only (?presenter=true); this makes it discoverable without
// competing with the page's primary actions. Named "Record Mode" because that's
// why it exists — a clean, chrome-free frame to screen-record from.
export function RecordModeButton({ page }: { page: string }) {
  return (
    <Link
      href={`${page}?presenter=true`}
      className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[11px] text-ink-400 hover:text-ink-100 hover:border-accent/30 transition-colors"
      title="Open a clean, full-screen view to screen-record from"
    >
      <span aria-hidden className="text-[11px] leading-none grayscale opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition">🎬</span>
      <span>Record Mode</span>
    </Link>
  );
}
