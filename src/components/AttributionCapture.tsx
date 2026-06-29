"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

// Captures first-touch UTM/ref on entry. Mounted once in the root layout.
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
