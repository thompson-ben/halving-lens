import Link from "next/link";
import { BriefSignup } from "@/components/BriefSignup";
import { ChapterRail } from "@/components/ChapterRail";
import { CycleDrawdownChart } from "@/components/CycleDrawdownChart";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { IssuanceStaircase } from "@/components/IssuanceStaircase";
import { JourneyNext } from "@/components/JourneyNext";
import { TodaysConfigurationCard } from "@/components/TodaysConfigurationCard";
import { TrackedSection } from "@/components/TrackedSection";
import { STANDING_CLOSE } from "@/lib/fourReferencePrices";

// Start Here — the calmest place on the internet to learn about Bitcoin.
// A narrative, not a glossary (/learn defines the what; this page narrates the
// why): seven honest questions, answered in plain English, arcing from "why
// does this exist" to the house philosophy — and only then into the product.
// One diagram per chapter at most, no CTA until the story has earned it.

const DESC =
  "A calm, plain-English introduction to Bitcoin — why it exists, why it moves the way it does, and why history is more useful than predictions. No jargon, no hype.";
export const metadata = {
  title: "Start Here — Bitcoin, explained calmly",
  description: DESC,
  alternates: { canonical: "/start-here" },
  openGraph: { title: "Bitcoin, explained calmly.", description: DESC, url: "/start-here", type: "article" },
  twitter: { card: "summary_large_image", title: "Bitcoin, explained calmly.", description: DESC },
};

const GOLD = "#d9b96a";

const CHAPTERS = [
  "Why does Bitcoin exist?",
  "Why do people think it has value?",
  "Why is it so volatile?",
  "Why does everyone talk about cycles?",
  "Why do ETFs matter?",
  "What are the biggest misconceptions?",
  "Why historical context instead of predictions?",
];
const chapterId = (n: number) => `chapter-${n}`;

export default function StartHerePage() {
  return (
    <div className="space-y-20 sm:space-y-24 max-w-3xl mx-auto">
      <ChapterRail ids={CHAPTERS.map((_, i) => chapterId(i + 1))} labels={CHAPTERS} />

      {/* Hero — reassurance first; deliberately no signup form here. */}
      <header className="pt-4 text-center">
        <div className="text-[10.5px] uppercase tracking-[0.24em] mb-5" style={{ color: GOLD }}>Start Here</div>
        <h1 className="font-display text-[40px] sm:text-[58px] font-medium tracking-tightest text-ink-50 leading-[1.04]">
          Bitcoin, explained calmly.
        </h1>
        <p className="mt-6 text-[15.5px] sm:text-[17px] text-ink-300 leading-relaxed max-w-xl mx-auto">
          No jargon, no hype, no one trying to sell you anything. Just the story, in plain English —
          about 12 minutes.
        </p>
      </header>

      {/* Chapter 1 */}
      <Chapter n={1} title={CHAPTERS[0]}>
        <P>
          Bitcoin appeared in the wreckage of the 2008 financial crisis, published by a pseudonymous
          author as a nine-page paper and a piece of open software. Its purpose was blunt: money that
          works without needing to trust a bank, a company, or a government to run it.
        </P>
        <P>
          The genuinely new idea inside it was <Em>digital scarcity</Em>. Anything digital had always
          been copyable — Bitcoin made a digital thing that cannot be duplicated or inflated. There
          will only ever be 21 million coins, issued on a schedule fixed in the software in 2009 that
          no company, committee, or country can change.
        </P>
        <Figure>
          <IssuanceStaircase />
        </Figure>
      </Chapter>

      {/* Chapter 2 */}
      <Chapter n={2} title={CHAPTERS[1]}>
        <P>
          Bitcoin pays no interest and produces no earnings, so its value rests on different ground.
          Three things, mainly. <Em>Scarcity</Em>: the 21-million limit is credible because no one can
          change it. <Em>A growing network</Em>: money is useful in proportion to how many people
          accept and hold it, and Bitcoin&apos;s network has grown through every crash so far.{" "}
          <Em>Real cost</Em>: new coins can&apos;t be conjured — they are earned by specialised
          computers doing costly work, which anchors the supply in physical reality.
        </P>
        <P>
          This is why serious observers reference what holders originally paid for their coins, and
          what it costs miners to produce new ones. Those reference points don&apos;t tell anyone
          what the price should be — but they describe where today&apos;s price sits relative to the
          people and machinery behind the network. Hold that thought; it becomes useful later.
        </P>
      </Chapter>

      {/* Chapter 3 */}
      <Chapter n={3} title={CHAPTERS[2]}>
        <P>
          Bitcoin is one of the most volatile major assets in the world, and it is honest to say so
          plainly: it has fallen more than 80% from a peak on several separate occasions. People who
          bought near tops have waited years to recover.
        </P>
        <P>
          The reasons are structural, not mysterious. It is young — measured in years, most assets it
          gets compared to are measured in centuries. Its value rests on collective belief about the
          future, which swings harder than cash flows do. And sentiment feeds on itself in both
          directions: rising prices attract buyers, falling prices frighten them away.
        </P>
        <Figure caption="How far below its own peak each cycle traded, day by day. Deep drawdowns are a recurring feature of the record, not an anomaly.">
          <CycleDrawdownChart height={300} />
        </Figure>
      </Chapter>

      {/* Chapter 4 */}
      <Chapter n={4} title={CHAPTERS[3]}>
        <P>
          Remember the staircase from Chapter 1: roughly every four years, the supply of new Bitcoin
          is cut in half. This is called the <Em>halving</Em> — a real, scheduled event in the
          software, not a theory.
        </P>
        <P>
          Around that rhythm, Bitcoin&apos;s price has so far moved in broad waves — strong runs,
          deep multi-year retreats, then recovery — that traders call <Em>cycles</Em>. Lining the
          cycles up by days-since-halving shows a family resemblance that is hard to dismiss and
          easy to overstate. The honest caveat belongs in the same breath: this has only happened a
          handful of times. Four cycles is a pattern, not a law.
        </P>
        <Figure caption="Each cycle's price path, normalised and lined up by days since its halving. A family resemblance — from a very small family.">
          <CycleOverlayChart mode="normalized" height={300} />
        </Figure>
        <Closing />
      </Chapter>

      {/* Chapter 5 */}
      <Chapter n={5} title={CHAPTERS[4]}>
        <P>
          For most of Bitcoin&apos;s life, buying it meant using a crypto exchange — a hurdle that
          kept most regulated and institutional money out. In January 2024, US regulators approved{" "}
          <Em>spot Bitcoin ETFs</Em>: ordinary stock-market funds that hold real Bitcoin. Pension
          accounts and brokerage clients could now hold Bitcoin the same way they hold an index
          fund.
        </P>
        <P>
          That matters for a structural reason: it opened a demand channel that did not exist in any
          previous cycle. It is also a reason for humility about the patterns in Chapter 4 — the
          buyers are different this time, so history is context for the present, not a script for
          it. You can watch this new demand daily on our <Link href="/etf" className="text-accent">ETF Flows</Link> page.
        </P>
      </Chapter>

      {/* Chapter 6 */}
      <Chapter n={6} title={CHAPTERS[5]}>
        <div className="space-y-3">
          {[
            {
              m: "“It's too late for me.”",
              r: "People have said this at every stage of Bitcoin's existence, at prices a fraction of today's. We can't tell you it isn't — nobody can — but the record shows the feeling itself is a permanent feature of the asset, not evidence about the future.",
            },
            {
              m: "“Someone controls it.”",
              r: "No company, foundation, or person can change Bitcoin's supply or seize the network. Thousands of independent computers enforce the same rules; changing them requires convincing essentially everyone.",
            },
            {
              m: "“It failed as payment, so it failed.”",
              r: "Bitcoin is slow and expensive for buying coffee. Most of its holders treat it as long-term savings — closer to digital gold than to a payment app. Judge it against what its users actually use it for.",
            },
            {
              m: "“The experts know where the price is going.”",
              r: "The public record of Bitcoin price predictions — bullish and bearish, famous and anonymous — is dismal in both directions. This misconception matters most, because it decides where you get your information.",
            },
          ].map((x) => (
            <div key={x.m} className="card p-5">
              <div className="text-[14px] font-medium text-ink-100">{x.m}</div>
              <p className="mt-1.5 text-[13px] text-ink-300 leading-relaxed">{x.r}</p>
            </div>
          ))}
        </div>
      </Chapter>

      {/* Chapter 7 */}
      <Chapter n={7} title={CHAPTERS[6]}>
        <P>
          Everything above points one direction. Bitcoin&apos;s future is genuinely unknown — the
          sample is tiny, the ETF era is new, and the prediction record is poor. What <Em>can</Em> be
          known, precisely and honestly, is where today stands relative to everything that has come
          before: how far from the peak, how it compares with the market&apos;s own cost anchors,
          which past moments looked most like this one, and what followed them.
        </P>
        <P>
          That is the entire HalvingLens method. We never tell you what Bitcoin will do. We show you
          where it is, against its own recorded history, every day — so the present feels legible
          instead of overwhelming. History can&apos;t tell you what happens next; it can tell you
          where you are.
        </P>
      </Chapter>

      {/* Bridge — the story has been told; now the product, as its conclusion. */}
      <TrackedSection id="start-here-bridge">
        <section className="space-y-6">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] mb-2" style={{ color: GOLD }}>
              So where is Bitcoin right now?
            </div>
            <p className="text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">
              Here is today&apos;s answer, computed from live data using exactly the reference points
              you met in Chapter 2:
            </p>
          </div>
          <TodaysConfigurationCard />
          <div className="card-glow p-6 sm:p-8">
            <BriefSignup heading="Learn as you go — one calm email each morning" />
          </div>
        </section>
      </TrackedSection>

      <JourneyNext from="/start-here" />
    </div>
  );
}

function Chapter({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <TrackedSection id={chapterId(n)}>
      <section id={chapterId(n)} className="scroll-mt-24">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
          Chapter {n} of {CHAPTERS.length} · {title}
        </div>
        <h2 className="font-display text-[26px] sm:text-[32px] font-medium tracking-tight-2 text-ink-50 leading-tight max-w-2xl">
          {title}
        </h2>
        <div className="mt-5 space-y-4">{children}</div>
      </section>
    </TrackedSection>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14.5px] text-ink-300 leading-relaxed max-w-2xl">{children}</p>;
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-100 font-medium">{children}</span>;
}

function Figure({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <div className="card p-4 sm:p-5 mt-2">
      {children}
      {caption && <p className="mt-3 text-[11.5px] text-ink-500 leading-relaxed">{caption}</p>}
    </div>
  );
}

// The standing close, where the narrative touches cycle analysis — always the
// shared constant, never a duplicated literal.
function Closing() {
  return <p className="text-[11.5px] text-ink-500">{STANDING_CLOSE}</p>;
}
