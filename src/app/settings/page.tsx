import { ComingSoon } from "@/components/ComingSoon";

export default function SettingsPage() {
  return (
    <ComingSoon
      eyebrow="Settings"
      title="Tune the lens"
      description="Pick your default chains, threshold sizes, alert channels, and which wallet cohorts you want to track. Defaults are good — overrides are powerful."
      features={[
        { name: "Default chains", detail: "Only see the chains you care about." },
        { name: "Smart-money cohorts", detail: "Build custom lists or subscribe to public ones." },
        { name: "Alert routing", detail: "Push, email, Telegram, webhook — set per signal type." },
        { name: "API access", detail: "Programmatic access to the same data the UI runs on." },
      ]}
    />
  );
}
