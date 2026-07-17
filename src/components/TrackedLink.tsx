"use client";

import Link from "next/link";
import { track } from "@/lib/track";

// A Link that fires a first-party analytics event on click. Lets server
// components (e.g. the Market Snapshot) record click-through without becoming
// client components themselves. Opted-out browsers are ignored inside track().
export function TrackedLink({
  href,
  event,
  props,
  className,
  children,
}: {
  href: string;
  event: string;
  props?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => track(event, props)}>
      {children}
    </Link>
  );
}
