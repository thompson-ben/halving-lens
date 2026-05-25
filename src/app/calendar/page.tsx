"use client";

import { useEffect, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { CalendarDays } from "lucide-react";

type ScheduleItem = {
  id: string;
  scheduledFor: string;
  status: string;
  caption: string | null;
  hashtags: string[];
  autoPost: boolean;
  content: {
    id: string;
    thumbnailUrl: string | null;
    carMake: string | null;
    carModel: string | null;
    originalAuthor: string | null;
    platform: string;
  };
};

export default function CalendarPage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function itemsForDay(d: Date) {
    return items.filter((it) => {
      const dt = new Date(it.scheduledFor);
      return (
        dt.getFullYear() === d.getFullYear() &&
        dt.getMonth() === d.getMonth() &&
        dt.getDate() === d.getDate()
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">Posting Calendar</h1>
          <p className="text-sm text-ink-300 mt-1">
            Approved content scheduled for publishing. Auto-post is disabled by default.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Prev
          </button>
          <button className="btn-secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            This week
          </button>
          <button className="btn-secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-ink-300">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled yet"
          description="Approve a piece of content from the Discovery Queue, then schedule it from its detail view."
        />
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {days.map((d) => {
            const dayItems = itemsForDay(d);
            return (
              <div key={d.toISOString()} className="card p-3 min-h-[160px]">
                <div className="text-xs text-ink-300">{format(d, "EEE")}</div>
                <div className="text-lg font-semibold text-ink-100 mb-2">{format(d, "d")}</div>
                <div className="space-y-1.5">
                  {dayItems.map((it) => (
                    <div key={it.id} className="rounded-md bg-ink-850 border border-ink-700 p-2 text-xs">
                      <div className="text-ink-100 font-medium truncate">
                        {it.content.carMake} {it.content.carModel}
                      </div>
                      <div className="text-ink-300">{format(new Date(it.scheduledFor), "HH:mm")}</div>
                      <div className="text-[10px] text-ink-400 mt-0.5">
                        {it.autoPost ? "Auto-post" : "Manual"}
                      </div>
                    </div>
                  ))}
                  {dayItems.length === 0 && <div className="text-[11px] text-ink-400">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
