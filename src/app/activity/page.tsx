import { ComingSoon } from "@/components/ComingSoon";

export default function ActivityPage() {
  return (
    <ComingSoon
      eyebrow="Activity"
      title="Your alerts, follows, and replays"
      description="Stream of everything you've followed, every alert that fired, and a replay timeline of the moves you watched vs. the ones you took."
      features={[
        { name: "Alert history", detail: "Searchable log of every firing." },
        { name: "Follow feed", detail: "Latest moves from your followed wallets." },
        { name: "Replay", detail: "What did the chain look like the moment you decided?" },
        { name: "Decision log", detail: "Tag your own trades against the signals you saw." },
      ]}
    />
  );
}
