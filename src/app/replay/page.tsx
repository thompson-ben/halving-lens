import { CycleReplay } from "@/components/CycleReplay";

const DESC =
  "Replay Bitcoin's halving cycles day by day and see where the current cycle sits against every prior cycle — historical context, not prediction.";
export const metadata = {
  title: { absolute: "Bitcoin Cycle Replay | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/replay" },
  openGraph: { title: "Bitcoin Cycle Replay", description: DESC, url: "/replay", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin Cycle Replay", description: DESC },
};

export default function ReplayPage() {
  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
          Cycle replay
        </div>
        <h1 className="font-display text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Scrub through every halving cycle.
          <br />
          <span className="text-ink-300">Watch the metrics evolve.</span>
        </h1>
        <p className="mt-5 text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Drag the timeline. Every oscillator updates to where it sat on that exact day from
          halving — across all four cycles, in sync. Hit play to watch a cycle unfold.
        </p>
      </header>

      <CycleReplay />
    </div>
  );
}
