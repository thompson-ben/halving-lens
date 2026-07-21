import { TestimonialForm } from "@/components/TestimonialForm";

// Reader testimonial page — linked from the Day-14 onboarding email. Not
// organic content, so it's kept out of the index. The signed e/t params (from
// the email link) are passed through for attribution; the form also works
// without them.
export const metadata = {
  title: { absolute: "Share your experience | HalvingLens" },
  description: "Tell us how HalvingLens helps.",
  robots: { index: false, follow: true },
};

const GOLD = "#d9b96a";

export default function TestimonialPage({ searchParams }: { searchParams: { e?: string; t?: string } }) {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <header className="space-y-3 text-center">
        <div className="text-[10.5px] uppercase tracking-[0.24em]" style={{ color: GOLD }}>Your experience</div>
        <h1 className="font-display text-[30px] lg:text-[38px] leading-[1.08] text-ink-50 tracking-tightest">
          How does HalvingLens help you?
        </h1>
        <p className="text-[14px] text-ink-300 leading-relaxed">
          A sentence or two is perfect — what it saves you, the context it gives, or how it changed the way you
          read the cycle. If we feature it, it&apos;ll only ever show the display name you choose, after we&apos;ve
          reviewed it.
        </p>
      </header>

      <TestimonialForm email={searchParams.e} token={searchParams.t} />

      <p className="text-center text-[11px] text-ink-500">Historical context, not financial advice.</p>
    </div>
  );
}
