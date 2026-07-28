// Founder Intelligence Layer — public surface. Consumers import from here.
export * from "./types";
export { confidenceFrom, confidenceLabel, minConfidence, type ConfidenceInputs } from "./confidence";
export { weekPeriod, trailingPeriod, priorPeriod, inWindow, compare, goodness, DEFAULT_TZ, type Comparison } from "./period";
export * from "./trends";
export { factToDataQuality, dedupeDataQuality } from "./dataQuality";
export { computeWeas, weasNorthStar, unavailableWeas, WEAS_DEFINITION_VERSION, type WeasEvent, type WeasInput } from "./northStar";
export { composeFeed, buildFounderReview, rankRecommendations, PHASE1_PROVIDERS } from "./composer";
export { canonicalConversion, computeConversion, type CanonicalConversion, type ConversionWindow } from "./metrics/conversion";
export { growthModule, mapGrowth } from "./modules/growth";
export { journeyModule, mapJourney } from "./modules/journey";
export { dailyBriefModule, mapDailyBrief } from "./modules/dailyBrief";
export { API_VERSION, INTELLIGENCE_SECTIONS, SECTION_TO_MODULE, isSection, shapeSection, intelligenceApiResponse, type IntelligenceEnvelope, type IntelligenceSection } from "./api";
export { authorizeIntelligence, type AuthResult, type IntelligencePrincipal } from "./apiAuth";
