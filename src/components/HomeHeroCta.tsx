"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import { assignVariant } from "@/lib/experiments";
import { StartSignup } from "./LandingClient";

// Homepage hero A/B (P4.2). Control ("cta") = the subscribe button that scrolls
// to the signup section; Variant ("inline") = a compact one-field email form in
// the hero. Assignment is stable per visitor; the variant rides along on the
// hero view + the signup funnel so a winner can be picked from the dashboard.
// Neither arm is committed to — control stays the current design.
export function HomeHeroCta() {
  const [variant, setVariant] = useState<string>("cta"); // SSR + first paint = control
  const fired = useRef(false);
  useEffect(() => {
    const v = assignVariant("home_hero");
    setVariant(v);
    if (!fired.current) {
      fired.current = true;
      track("home_hero_view", { variant: v, ...getAttribution() });
    }
  }, []);

  return (
    <div className="mt-7">
      <p className="text-[13.5px] text-ink-200">
        One clear Bitcoin cycle update each morning. No hype. No predictions.
      </p>

      {variant === "inline" ? (
        <div className="mt-3 max-w-md">
          <StartSignup source="/" buttonLabel="Get the free daily brief" variant="inline" />
          <div className="mt-3">
            <Link href="/price" className="inline-flex items-center gap-1.5 text-[13px] text-ink-300 hover:text-ink-100">
              Explore full cycle analysis <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <Link
            href="/#subscribe"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors"
          >
            Get the free daily brief <ArrowUpRight size={16} />
          </Link>
          <Link href="/price" className="inline-flex items-center gap-1.5 text-[13px] text-ink-300 hover:text-ink-100">
            Explore full cycle analysis <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
