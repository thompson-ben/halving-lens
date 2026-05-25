"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatNumber, formatPercent, relativeTime } from "@/lib/utils";
import { StatCard } from "@/components/StatCard";
import { Heart, MessageCircle, TrendingUp, Calendar } from "lucide-react";
import type { LearnedModel } from "@/lib/scoring";

type AnalyticsResponse = {
  totals: { posts: number; totalLikes: number; totalComments: number; avgEngagement: number };
  model: LearnedModel;
  topPosts: Array<{
    id: string;
    caption: string | null;
    permalink: string | null;
    thumbnailUrl: string | null;
    carMake: string | null;
    carModel: string | null;
    likes: number;
    comments: number;
    reach: number | null;
    timestamp: string;
  }>;
  brandStats: Array<{ make: string; lift: number; label: string }>;
  timeline: Array<{ week: string; avgLikes: number; avgEngagement: number; posts: number }>;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="text-sm text-ink-300">Loading analytics…</div>;

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}`,
    lift: Number(((data.model.hourLift[h] ?? 0) * 100 - 100).toFixed(1)),
  }));

  const dowData = Array.from({ length: 7 }, (_, d) => ({
    day: DOW[d],
    lift: Number(((data.model.dowLift[d] ?? 0) * 100 - 100).toFixed(1)),
  }));

  const brandData = data.brandStats.slice(0, 8).map((b) => ({
    label: b.label,
    lift: Number(((b.lift - 1) * 100).toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-100">Analytics</h1>
        <p className="text-sm text-ink-300 mt-1">
          Historical performance from your Instagram account. The performance learning engine updates after every sync.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Posts analysed" value={formatNumber(data.totals.posts)} icon={Calendar} />
        <StatCard label="Total likes" value={formatNumber(data.totals.totalLikes)} icon={Heart} tone="accent" />
        <StatCard label="Total comments" value={formatNumber(data.totals.totalComments)} icon={MessageCircle} />
        <StatCard
          label="Avg engagement"
          value={formatPercent(data.totals.avgEngagement)}
          icon={TrendingUp}
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Lift by car brand" subtitle="% above/below your average likes">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={brandData}>
              <CartesianGrid stroke="#1b2128" />
              <XAxis dataKey="label" stroke="#8a96a4" tick={{ fontSize: 11 }} />
              <YAxis stroke="#8a96a4" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="lift">
                {brandData.map((b, i) => (
                  <Cell key={i} fill={b.lift >= 0 ? "#d4af37" : "#5b6877"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lift by posting hour" subtitle="Local time, % vs. average">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourData}>
              <CartesianGrid stroke="#1b2128" />
              <XAxis dataKey="hour" stroke="#8a96a4" tick={{ fontSize: 11 }} />
              <YAxis stroke="#8a96a4" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="lift">
                {hourData.map((d, i) => (
                  <Cell key={i} fill={d.lift >= 0 ? "#3ddc97" : "#5b6877"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lift by day of week" subtitle="% vs. average">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dowData}>
              <CartesianGrid stroke="#1b2128" />
              <XAxis dataKey="day" stroke="#8a96a4" tick={{ fontSize: 11 }} />
              <YAxis stroke="#8a96a4" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="lift">
                {dowData.map((d, i) => (
                  <Cell key={i} fill={d.lift >= 0 ? "#5aa9ff" : "#5b6877"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average likes over time" subtitle="By posting week">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.timeline}>
              <CartesianGrid stroke="#1b2128" />
              <XAxis dataKey="week" stroke="#8a96a4" tick={{ fontSize: 10 }} />
              <YAxis stroke="#8a96a4" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="avgLikes" stroke="#d4af37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="section-title mb-3">Top posts</div>
          <div className="divide-y divide-ink-700">
            {data.topPosts.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                {p.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnailUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-100 truncate">{p.caption ?? "—"}</div>
                  <div className="text-xs text-ink-300">
                    {p.carMake} {p.carModel} · {relativeTime(p.timestamp)}
                  </div>
                </div>
                <div className="text-right text-xs text-ink-300">
                  <div className="text-ink-100 font-medium">{formatNumber(p.likes)} likes</div>
                  <div>{formatNumber(p.comments)} comments</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title mb-3">Top hashtags</div>
          <div className="space-y-2">
            {data.model.topHashtags.slice(0, 10).map((h) => (
              <div key={h.tag} className="flex items-center justify-between text-sm">
                <span className="text-ink-100">{h.tag}</span>
                <span className={h.lift >= 1 ? "text-signal-green" : "text-ink-300"}>
                  {((h.lift - 1) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {data.model.topHashtags.length === 0 && (
              <div className="text-xs text-ink-300">Sync more posts to surface hashtag performance.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="section-title">{title}</div>
        {subtitle && <span className="text-[11px] text-ink-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "#0b0d10",
  border: "1px solid #1b2128",
  borderRadius: 8,
  fontSize: 12,
  color: "#e6eaef",
};
