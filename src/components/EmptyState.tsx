import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center text-ink-300">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-base font-medium text-ink-100">{title}</div>
      {description && <div className="text-sm text-ink-300 max-w-md">{description}</div>}
      {action}
    </div>
  );
}
