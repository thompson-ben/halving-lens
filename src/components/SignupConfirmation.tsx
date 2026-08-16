import Link from "next/link";
import { Check, Mail, ArrowRight, User, TrendingUp, Share2 } from "lucide-react";

// Post-signup confirmation (P5). Replaces the old forced 3.5s redirect with a
// clear, calm next-steps state. Two variants:
//   • success  — a brand-new subscriber: confirm, then a few ordered next steps.
//   • existing — an already-subscribed address: recognise them (no "duplicate
//     signup" implication, no new Lead) and offer useful routes.
// Presentational only — the form has already decided the variant and fired the
// right events. `readHref` is the single recommended "today" page.

// Programme 1 (continuity): the recommended "today" destination is the Cycle
// Dashboard — the surface the Daily Brief's only CTA, the day-3 onboarding
// email and the veteran broadcast all point at. This is the highest-intent
// moment in the whole journey and it previously pointed elsewhere.
const READ_HREF = "/cycle-dashboard";
const SHARE_HREF =
  "https://x.com/intent/tweet?text=" +
  encodeURIComponent("Reading HalvingLens — daily Bitcoin cycle research in historical context, no hype or predictions.") +
  "&url=" +
  encodeURIComponent("https://halvinglens.com");

export function SignupConfirmation({ variant }: { variant: "success" | "existing" }) {
  if (variant === "existing") {
    return (
      <div className="space-y-4 text-left" role="status" aria-live="polite">
        <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[13.5px]">
          <Check size={16} /> You&apos;re already subscribed.
        </div>
        <p className="text-[13px] text-ink-300 leading-relaxed max-w-md">
          Nothing more to do — the daily brief keeps arriving each morning. If you&apos;d like to pick
          up where you left off:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg">
          <NextCard href={READ_HREF} icon={TrendingUp} title="See this morning&apos;s check" body="The whole checked market, as of this morning." />
          <NextCard href="/profile" icon={User} title="Access your profile" body="Sign in or request a new access link." />
        </div>
        <p className="text-[11px] text-ink-500 leading-relaxed max-w-md">
          Not seeing the brief? Check spam or promotions and add{" "}
          <span className="text-ink-200">brief@halvinglens.com</span> to your contacts. It arrives around 8am UK.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left" role="status" aria-live="polite">
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[13.5px]">
          <Check size={16} /> You&apos;re subscribed — your first email is on its way.
        </div>
      </div>

      <ol className="space-y-2.5 max-w-lg">
        <Step n={1} icon={Mail} title="Open the welcome email">
          It confirms delivery and lets you add <span className="text-ink-200">brief@halvinglens.com</span> to your
          contacts, so the daily brief always reaches your inbox (check spam or promotions if it&apos;s not there in a
          minute).
        </Step>
        <Step n={2} icon={TrendingUp} title="See this morning&apos;s check" href={READ_HREF} cta="Open the Cycle Dashboard">
          The whole checked market, as of this morning — the working behind tomorrow&apos;s brief.
        </Step>
        <Step n={3} icon={User} title="Set up your member profile" href="/profile" cta="Create your free profile">
          Save your reading streak, referrals and Founding Member status.
        </Step>
      </ol>

      <div className="pt-1">
        <a
          href={SHARE_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-accent transition-colors"
        >
          <Share2 size={13} /> Share HalvingLens
        </a>
      </div>

      <p className="text-[11px] text-ink-500 leading-relaxed max-w-md">
        The daily brief arrives around 8am UK. Unsubscribe in one click anytime.
      </p>
    </div>
  );
}

function Step({ n, icon: Icon, title, href, cta, children }: { n: number; icon: typeof Mail; title: string; href?: string; cta?: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <span className="shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-[12px] font-medium flex items-center justify-center">{n}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-100">
          <Icon size={13} className="text-accent" /> {title}
        </div>
        <p className="mt-1 text-[12px] text-ink-400 leading-relaxed">{children}</p>
        {href && cta && (
          <Link href={href} className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline">
            {cta} <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </li>
  );
}

function NextCard({ href, icon: Icon, title, body }: { href: string; icon: typeof Mail; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:border-accent/30 transition-colors group">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink-100">
        <Icon size={13} className="text-accent" /> {title}
      </div>
      <p className="mt-1 text-[12px] text-ink-400 leading-relaxed">{body}</p>
    </Link>
  );
}
