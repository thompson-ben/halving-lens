import { BriefSignup } from "./BriefSignup";

// Contextual end-of-content subscription CTA for distributed pages (P7.2). A
// reader who lands from a social post reads the piece, then meets a relevant
// subscribe prompt with context-sensitive copy. Reuses the existing BriefSignup
// (attribution + the PR1 subscription contract come for free) — no new tooling.
export function ArticleSubscribe({
  heading = "Get this context in your inbox each morning",
  blurb = "One clear Bitcoin cycle update every morning — historical context, no hype, no predictions.",
}: {
  heading?: string;
  blurb?: string;
}) {
  return <BriefSignup heading={heading} blurb={blurb} />;
}
