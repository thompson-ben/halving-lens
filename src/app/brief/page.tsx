import { BriefBody } from "@/components/BriefBody";

export const metadata = {
  title: "Daily Bitcoin Cycle Brief",
  description: "A daily, plain-English summary of where Bitcoin sits in the halving cycle.",
  alternates: { canonical: "/brief" },
};

export default function BriefPage() {
  return <BriefBody />;
}
