export function fmtUsd(n: number, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const { compact = false, sign = false } = opts;
  const abs = Math.abs(n);
  // The magnitude is always formatted from |n|; the sign is a typographic
  // prefix OUTSIDE the currency symbol — "−$131.53M", never "$-131.53M".
  // U+2212 minus, matching the movers' describe layer, so every surface
  // (dashboard, cards, emails) prints negatives identically.
  let body: string;
  if (compact) {
    if (abs >= 1e12) body = `$${(abs / 1e12).toFixed(2)}T`;
    else if (abs >= 1e9) body = `$${(abs / 1e9).toFixed(2)}B`;
    else if (abs >= 1e6) body = `$${(abs / 1e6).toFixed(2)}M`;
    else if (abs >= 1e3) body = `$${(abs / 1e3).toFixed(2)}K`;
    else body = `$${abs.toFixed(2)}`;
  } else if (abs < 1) {
    body = `$${abs.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}`;
  } else {
    body = abs.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: abs < 10 ? 4 : 2 });
  }
  if (n < 0) return `−${body}`;
  if (sign && n > 0) return `+${body}`;
  return body;
}

export function fmtPct(n: number, digits = 2, sign = true): string {
  const s = n.toFixed(digits) + "%";
  return sign && n > 0 ? `+${s}` : s;
}

export function fmtNum(n: number, opts: { compact?: boolean } = {}): string {
  const { compact = false } = opts;
  const abs = Math.abs(n);
  if (compact) {
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toFixed(0);
  }
  return n.toLocaleString("en-US");
}

export function shortAddr(addr: string, leading = 4, trailing = 4): string {
  if (!addr) return "";
  if (addr.length <= leading + trailing + 2) return addr;
  return `${addr.slice(0, leading + 2)}…${addr.slice(-trailing)}`;
}

export function timeAgo(iso: string | number | Date): string {
  const ts = typeof iso === "number" ? iso : new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** 72 → "72nd", 68 → "68th" — a publication never prints "72th". */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
