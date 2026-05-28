import { cn } from "@/lib/cn";

type Tone = "green" | "red" | "amber" | "blue" | "violet" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  green: "text-signal-green bg-signal-green/10 border-signal-green/20",
  red: "text-signal-red bg-signal-red/10 border-signal-red/20",
  amber: "text-signal-amber bg-signal-amber/10 border-signal-amber/20",
  blue: "text-signal-blue bg-signal-blue/10 border-signal-blue/20",
  violet: "text-signal-violet bg-signal-violet/10 border-signal-violet/20",
  muted: "text-ink-300 bg-white/[0.03] border-white/5",
};

interface Props {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function SignalBadge({ tone = "muted", children, className, icon }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-medium tracking-wide",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function ChangePill({ value, className }: { value: number; className?: string }) {
  const tone: Tone = value > 0 ? "green" : value < 0 ? "red" : "muted";
  return (
    <span
      className={cn(
        "font-mono text-[12.5px] tabular-nums",
        tone === "green" && "text-signal-green",
        tone === "red" && "text-signal-red",
        tone === "muted" && "text-ink-300",
        className,
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
