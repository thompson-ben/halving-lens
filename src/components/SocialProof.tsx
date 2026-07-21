import { Users } from "lucide-react";
import { subscriberStats } from "@/lib/analytics";
import { roundedReaders, SOCIAL_PROOF_MIN_DEFAULT } from "@/lib/socialProof";

// Truthful subscriber-count social proof (P6.1). Server component: reads the
// REAL active count, rounds DOWN to a band, and only renders above a
// configurable threshold (SOCIAL_PROOF_MIN). Renders nothing below threshold or
// when the store isn't configured — so it can never show a fabricated or tiny
// number. No subscriber identities are exposed.
export async function SocialProof({ className, label }: { className?: string; label?: string }) {
  const min = Number(process.env.SOCIAL_PROOF_MIN) || SOCIAL_PROOF_MIN_DEFAULT;
  const stats = await subscriberStats();
  const n = roundedReaders(stats.active, min);
  if (n == null) return null;

  return (
    <p className={`inline-flex items-center gap-1.5 text-[12px] text-ink-400 ${className ?? ""}`}>
      <Users size={13} className="text-ink-500 shrink-0" />
      {label ?? `Join ${n.toLocaleString()}+ readers getting the daily brief.`}
    </p>
  );
}
