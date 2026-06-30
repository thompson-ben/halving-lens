"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/personalize";

// Invisible recorder: logs the current content page into the local "recently
// viewed" history that powers the dashboard. Render once per content page.
export function RecordView({ kind, title, href }: { kind: string; title: string; href: string }) {
  useEffect(() => {
    recordView({ kind, title, href });
  }, [kind, title, href]);
  return null;
}
