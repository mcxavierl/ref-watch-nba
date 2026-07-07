import Link from "next/link";
import type { EdgeSummaryItem } from "@/lib/edge-summary";
import { ConfidenceTierBadge } from "@/components/ConfidenceTierBadge";

export function TonightEdgeSummary({
  items,
  title = "Tonight's biggest officiating factors",
  emptyMessage = "No standout officiating edges on this slate — scan game cards below for crew history.",
}: {
  items: EdgeSummaryItem[];
  title?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold tracking-tight text-zinc-900">
        {title}
      </h2>
      <ol className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group block rounded-lg border border-border bg-white px-4 py-3 transition hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-bold text-zinc-900 group-hover:text-raptors">
                  {index + 1}. {item.matchup}
                </p>
                <ConfidenceTierBadge tier={item.confidence} />
              </div>
              <p className="mt-1.5 text-sm leading-snug text-zinc-700">
                {item.edge}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500">{item.sample}</p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
