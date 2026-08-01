import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { QuestionEntry } from "@/lib/questions/types";

// A question link card (PR-Q1) — used by the hub shelves and the Related
// Questions rail. Deliberately reference-library calm: the question and its
// one-line description. No dates, no authors, no reading times (hub contract,
// commission §6 / founder amendment 8).

export function QuestionCard({ entry }: { entry: QuestionEntry }) {
  return (
    <Link
      href={`/questions/${entry.slug}`}
      className="card p-5 flex flex-col gap-2 group hover:border-ink-600 transition-colors"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-[14.5px] font-medium text-ink-100 leading-snug">{entry.question}</span>
        <ArrowUpRight className="w-3.5 h-3.5 mt-1 shrink-0 text-ink-500 group-hover:text-ink-200 transition-colors" aria-hidden />
      </span>
      <span className="text-[12px] text-ink-400 leading-relaxed">{entry.description}</span>
    </Link>
  );
}
