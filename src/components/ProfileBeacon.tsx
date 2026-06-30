"use client";

import { useEffect } from "react";
import { syncProfile } from "@/lib/profileClient";

// Invisible: on each load, if a profile is signed in, record the visit (for true
// WAES) and reconcile local ⇄ profile state. No-op for anonymous visitors.
export function ProfileBeacon() {
  useEffect(() => {
    void syncProfile();
  }, []);
  return null;
}
