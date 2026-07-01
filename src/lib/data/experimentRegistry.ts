// Growth experiment registry — the source of truth for every A/B test, planned,
// running or completed. Config-driven (committed + version-controlled, like the
// editions and ad-spend registries) so every experiment and its decision is
// permanently recorded. Completed entries with `lessons` ARE the Growth
// Knowledge Base — so we get smarter every month and never repeat a failed test.
//
// To run a new test: add an entry here, wire its variants into experiments.ts
// (client assignment) and fire the `variant` prop on the relevant landing/signup
// events. The admin dashboard computes results automatically.

export type ExperimentStatus = "planned" | "running" | "completed" | "cancelled";

export interface ExperimentVariant {
  key: string; // "a" | "b" | ...
  label: string;
  description?: string;
}

export interface ExperimentSpec {
  id: string; // stable slug, e.g. "start-headline"
  title: string;
  description: string;
  hypothesis: string;
  rationale: string; // why we believe this
  owner: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  status: ExperimentStatus;
  surface: string; // what's being tested, e.g. "/start hero headline"
  trafficAllocation: number; // % of eligible traffic, 0-100
  eventKey: string; // the `variant` value-space measured from events (matches experiments.ts key)
  // How results are measured: "variant" = an A/B on props.variant (default);
  // "campaign" = a channel test measured by props.utm_campaign (each variant.key
  // is a utm_campaign name). Lift/confidence only apply to multi-variant tests.
  measure?: "variant" | "campaign";
  variants: ExperimentVariant[];
  primaryKpi: string;
  secondaryKpis?: string[];
  winner?: string; // variant key, set when completed
  decision?: string; // what we did with the result
  lessons?: string; // knowledge-base entry
  liveChange?: boolean; // did the winning change remain live?
}

export const EXPERIMENTS_REGISTRY: ExperimentSpec[] = [
  {
    id: "start-headline",
    title: "Landing headline — clarity vs curiosity",
    description: "Tests two hero headlines on the /start landing page.",
    hypothesis: "A curiosity-led headline (B) converts more cold visitors to subscribers than the clarity-led control (A).",
    rationale: "Cold paid traffic often responds to an open loop / curiosity gap more than a descriptive value statement.",
    owner: "Founder",
    startDate: "2026-06-01",
    status: "running",
    surface: "/start hero headline",
    trafficAllocation: 100,
    eventKey: "start_headline",
    variants: [
      { key: "a", label: "Clarity", description: "“The clearest view of the Bitcoin cycle.”" },
      { key: "b", label: "Curiosity", description: "“Know where Bitcoin sits — before you check the price.”" },
    ],
    primaryKpi: "Visitor → subscriber conversion",
    secondaryKpis: ["CTA click rate", "Visitor → WAES"],
  },
  {
    id: "meta-learn-jul26",
    title: "Meta learning campaign — paid acquisition to /free",
    description: "First paid Meta test: does cold Meta traffic to /free produce engaged subscribers (WAES) at a viable cost?",
    hypothesis: "Cold Meta traffic to /free converts to subscribers and WAES at a cost low enough to justify scaling paid acquisition.",
    rationale: "The product and funnel are fully instrumented; a small measured test is the fastest, cheapest way to learn true unit economics before committing budget.",
    owner: "Founder",
    startDate: "2026-07-01",
    status: "running",
    surface: "Meta ads → /free landing",
    trafficAllocation: 100,
    eventKey: "meta_learn_jul26",
    measure: "campaign",
    variants: [{ key: "meta_learn_jul26", label: "Meta → /free" }],
    primaryKpi: "Cost per WAES",
    secondaryKpis: ["Cost per subscriber", "Landing conversion %", "Email open rate of paid subs"],
  },
];

export function allExperiments(): ExperimentSpec[] {
  const order: Record<ExperimentStatus, number> = { running: 0, planned: 1, completed: 2, cancelled: 3 };
  return [...EXPERIMENTS_REGISTRY].sort((a, b) => order[a.status] - order[b.status]);
}

export function completedExperiments(): ExperimentSpec[] {
  return EXPERIMENTS_REGISTRY.filter((e) => e.status === "completed");
}
