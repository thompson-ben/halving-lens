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
];

export function allExperiments(): ExperimentSpec[] {
  const order: Record<ExperimentStatus, number> = { running: 0, planned: 1, completed: 2, cancelled: 3 };
  return [...EXPERIMENTS_REGISTRY].sort((a, b) => order[a.status] - order[b.status]);
}

export function completedExperiments(): ExperimentSpec[] {
  return EXPERIMENTS_REGISTRY.filter((e) => e.status === "completed");
}
