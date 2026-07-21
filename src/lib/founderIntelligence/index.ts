// Founder Intelligence Layer — public surface. Consumers import from here.
export * from "./types";
export { confidenceFrom, confidenceLabel, minConfidence, type ConfidenceInputs } from "./confidence";
export { weekPeriod, priorPeriod, inWindow, compare, goodness, DEFAULT_TZ, type Comparison } from "./period";
export { factToDataQuality, dedupeDataQuality } from "./dataQuality";
export { computeWeas, weasNorthStar, unavailableWeas, WEAS_DEFINITION_VERSION, type WeasEvent, type WeasInput } from "./northStar";
export { composeFeed, buildFounderReview, rankRecommendations, PHASE1_PROVIDERS } from "./composer";
