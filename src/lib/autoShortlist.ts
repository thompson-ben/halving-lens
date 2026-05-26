import { prisma } from "@/lib/prisma";
import { loadCooldownBrands, scoreCandidate } from "@/lib/picks";

export type AutoShortlistResult = {
  ran: boolean;
  reason?: string;
  threshold: number;
  candidatesEvaluated: number;
  shortlisted: number;
  dryRun: boolean;
  promoted: Array<{ id: string; composite: number; carMake: string | null; caption: string | null }>;
};

// Composite scores from /lib/picks are in [0,1]; the operator-facing
// threshold is in [0,100]. Normalise here so the Settings slider can speak
// in human numbers without leaking the implementation detail.
function thresholdToScore(threshold: number): number {
  return Math.max(0, Math.min(100, threshold)) / 100;
}

export async function autoShortlistRun(opts: {
  settings: { enabled: boolean; threshold: number };
  dryRun: boolean;
}): Promise<AutoShortlistResult> {
  const { settings, dryRun } = opts;

  if (!settings.enabled && !dryRun) {
    return {
      ran: false,
      reason: "auto_shortlist_enabled is off",
      threshold: settings.threshold,
      candidatesEvaluated: 0,
      shortlisted: 0,
      dryRun,
      promoted: [],
    };
  }

  const cutoff = thresholdToScore(settings.threshold);

  // Only candidates currently in `new` state are eligible — we don't want to
  // re-shortlist items the operator has explicitly rejected, scheduled, or
  // is already considering manually.
  const candidates = await prisma.discoveredContent.findMany({
    where: { status: "new" },
    orderBy: { discoveredAt: "desc" },
    take: 500,
  });

  const cooldownBrands = await loadCooldownBrands();
  const now = Date.now();
  const winners = candidates
    .map((c) => scoreCandidate(c, cooldownBrands, now))
    .filter((s) => s.composite >= cutoff);

  if (!dryRun && winners.length > 0) {
    await prisma.discoveredContent.updateMany({
      where: { id: { in: winners.map((w) => w.content.id) } },
      data: { status: "shortlisted", shortlistedAt: new Date() },
    });
  }

  return {
    ran: true,
    threshold: settings.threshold,
    candidatesEvaluated: candidates.length,
    shortlisted: winners.length,
    dryRun,
    promoted: winners.slice(0, 20).map((w) => ({
      id: w.content.id,
      composite: Number(w.composite.toFixed(4)),
      carMake: w.content.carMake,
      caption: w.content.caption,
    })),
  };
}
