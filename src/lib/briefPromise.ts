// THE pre-signup promise for the Daily Brief — one authority, quoted by every
// surface that describes the Brief before it arrives (the signup form and the
// welcome email today).
//
// Why this exists (Programme 1, truth correction): the signup form and the
// welcome email each carried their own hand-maintained bullet list, and both
// promised "What to watch next". Daily Brief V2 has no watch section — so the
// promise was made twice before the first edition landed and delivered zero
// times. Two copies of a promise drift; one cannot.
//
// RULE FOR EDITING: every line here must map to something that ships in EVERY
// edition of Daily Brief V2. Today that is the verdict line (including its
// quiet classes), the primary story card with its rarity evidence, the State
// of the Cycle rows with their since-dates, and the standing disclaimer. If a
// line cannot be traced to the briefIntel payload, it does not belong here —
// scripts/test-conversion-truth.ts enforces the retired vocabulary and the
// withdrawn watch promise.
export const BRIEF_PROMISE: readonly string[] = [
  "A verdict every morning — including “nothing changed”",
  "The one reading that moved, and how unusual it was",
  "What has held, and for how long",
  "Thirty seconds. No predictions, no price targets",
];

/** The same promise with typographic quotes flattened, for plain-text email. */
export const BRIEF_PROMISE_TEXT: readonly string[] = BRIEF_PROMISE.map((b) =>
  b.replace(/[“”]/g, '"'),
);
