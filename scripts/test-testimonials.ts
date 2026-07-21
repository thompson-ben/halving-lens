// Deterministic tests for the pure testimonial validation (P6.2).
// Run: npm run test-testimonials

import { cleanTestimonial, QUOTE_MAX } from "../src/lib/testimonials";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };

// Consent is REQUIRED — never publish words someone didn't agree to share.
assert(!cleanTestimonial({ quote: "Genuinely helpful every morning.", displayName: "Sam", consent: false }).ok, "no consent → rejected");
assert(!cleanTestimonial({ quote: "Genuinely helpful every morning.", displayName: "Sam" }).ok, "missing consent → rejected");

// Length + presence checks.
assert(!cleanTestimonial({ quote: "too short", displayName: "Sam", consent: true }).ok, "quote under minimum → rejected");
assert(!cleanTestimonial({ quote: "x".repeat(QUOTE_MAX + 1), displayName: "Sam", consent: true }).ok, "quote over maximum → rejected");
assert(!cleanTestimonial({ quote: "A genuinely useful daily read.", displayName: "", consent: true }).ok, "no display name → rejected");

// Happy path — trims + collapses whitespace, role optional.
const ok = cleanTestimonial({ quote: "  Saves me   time and gives real context.  ", displayName: "  Sam  ", role: " long-term holder ", consent: true });
assert(ok.ok && ok.value?.quote === "Saves me time and gives real context.", "valid quote is trimmed + whitespace-collapsed");
assert(ok.value?.displayName === "Sam", "display name trimmed");
assert(ok.value?.role === "long-term holder", "role trimmed");

const noRole = cleanTestimonial({ quote: "Clear and calm, no hype.", displayName: "Alex", consent: true });
assert(noRole.ok && noRole.value?.role === null, "role omitted → null (optional)");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll testimonial tests passed.");
process.exit(failures ? 1 : 0);
