import Link from "next/link";
import type { EdgeSummaryItem } from "@/lib/edge-summary";
import { ConfidenceTierBadge } from "@/components/ConfidenceTierBadge";

export function TonightEdgeSummary({
  items,
  title = "Tonight's biggest officiating factors",
  emptyMessage = "No standout officiating edges on this slate; scan game cards below for crew history.",
}: {
  items: EdgeSummaryItem[];
  title?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <section className="section-block-tight">
        <h2 className="section-title">{title}</h2>
        <p className="section-lead">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="section-block-tight">
      <h2 className="section-title">{title}</h2>
      <ol className="edge-summary-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="edge-summary-link group">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <p className="min-w-0 flex-1 text-sm font-bold text-zinc-900 group-hover:text-raptors">
                  {item.matchup}
                </p>
                <ConfidenceTierBadge tier={item.confidence} className="shrink-0" />
              </div>
              <p className="mt-2 text-sm leading-snug text-zinc-700">
                {item.edge}
              </p>
              <p className="mt-2 text-xs text-zinc-500">{item.sample}</p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
