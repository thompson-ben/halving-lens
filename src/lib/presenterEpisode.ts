// The copyable episode script for "Documenting the Cycle" (SoB 2.0, PR-SB5).
//
// A PROJECTION of the weekly briefing model into plain text — it computes
// nothing and phrases nothing of its own. Every sentence is either a named
// slot from weeklyBriefing() (verdict, glance answers, bridges, points, watch
// items), a shared describe-layer line, or a static cue from the running
// order. The page, the HUD and this script can therefore never quote
// different weekly figures, name different leaders, or follow different
// orders: they are three views of one object.
//
// Server-side only: the HUD receives the finished text as a prop, so none of
// the data layer reaches the client bundle.
//
// Historical context. Not forecasts.

import { weeklyBriefing } from "./weeklyBriefing";
import { formatMovement, rarityLine } from "./marketMovers";
import { PRESENTER_RUNNING_ORDER, EPISODE_TARGET_LABEL, type PresenterSection } from "./presenterScript";

const mmss = (total: number): string => `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;

/** A running-order entry with its spoken transition attached — the SAME
 *  bridge the page prints between the acts, never a second phrasing. */
export interface PresenterSectionView extends PresenterSection {
  bridge: string | null;
}

/** The running order joined to the briefing model: section i is followed by
 *  the model's bridge i (the front page is 0). The last act has no bridge —
 *  the episode closes on the verdict instead. */
export function presenterSections(): PresenterSectionView[] {
  const bridges = weeklyBriefing().bridges;
  return PRESENTER_RUNNING_ORDER.map((s, i) => ({ ...s, bridge: bridges[i] ?? null }));
}

export function presenterEpisode(): string {
  const b = weeklyBriefing();
  const order = presenterSections();
  const total = order.reduce((n, s) => n + s.targetSeconds, 0);
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push(
    `DOCUMENTING THE CYCLE — episode prep · as of ${b.asOf}`,
    `Target ${EPISODE_TARGET_LABEL} (${mmss(total)} across ${order.length} parts). Open on the verdict; close on the same verdict.`,
    "",
    "THE VERDICT",
    b.verdict,
  );

  for (const [i, s] of order.entries()) {
    push("", `${i + 1}. ${s.title.toUpperCase()} · ~${s.targetSeconds}s`, s.cue);

    if (s.id === "today") {
      for (const g of b.glance) push(`  ${g.act}. ${g.label} ${g.answer}`);
    }
    if (s.id === "movers") {
      const top = b.movers.movements.slice(0, 3);
      if (top.length === 0) push("  A quiet week — nothing moved materially. Say so plainly.");
      for (const m of top) push(`  • ${m.label} ${formatMovement(m)} — ${rarityLine(m)}`);
    }
    if (s.id === "matters") {
      // The page numbers these 4.1-4.5, so "point 4.3" has one meaning on a
      // recording — the script speaks the same language.
      for (const p of b.points.points) push(`  4.${p.rank} ${p.headline}`);
    }
    if (s.id === "watching") {
      if (b.previousWatch) {
        push(`  Last week (${b.previousWatch.dateLabel}): ${b.previousWatch.signal}. Then: ${b.previousWatch.then}. Now: ${b.previousWatch.now}.`);
      }
      for (const w of b.watchItems) push(`  • ${w.title}${w.top ? " (priority)" : ""} — meaningful change: ${w.trigger}`);
      push("", "  CLOSE ON THE VERDICT", `  ${b.verdict}`);
    }

    if (s.bridge) push(`  → speak: “${s.bridge}”`);
  }

  push("", "Historical context. Not prediction. Not financial advice.");
  return lines.join("\n");
}
