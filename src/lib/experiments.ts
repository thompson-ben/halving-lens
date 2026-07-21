"use client";

// Lightweight, config-driven A/B testing for the landing page. Add an experiment
// by listing its variants here; assignment is stable per visitor (localStorage),
// and the assigned variant rides along on landing + signup events so the
// dashboard can pick a winner. Future experiments require only config.

export interface Experiment {
  key: string;
  variants: string[];
}

export const EXPERIMENTS: Record<string, Experiment> = {
  start_headline: { key: "start_headline", variants: ["a", "b"] },
  // Homepage hero: "cta" = subscribe button that scrolls to the signup (control);
  // "inline" = a compact one-field email form right in the hero (variant).
  home_hero: { key: "home_hero", variants: ["cta", "inline"] },
};

export function assignVariant(key: string): string {
  const exp = EXPERIMENTS[key];
  if (!exp) return "a";
  if (typeof window === "undefined") return exp.variants[0];
  try {
    const k = `hl.exp.${key}`;
    let v = localStorage.getItem(k);
    if (!v || !exp.variants.includes(v)) {
      v = exp.variants[Math.floor(Math.random() * exp.variants.length)];
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return exp.variants[0];
  }
}

export function getVariant(key: string): string {
  if (typeof window === "undefined") return "a";
  try {
    return localStorage.getItem(`hl.exp.${key}`) || "a";
  } catch {
    return "a";
  }
}
