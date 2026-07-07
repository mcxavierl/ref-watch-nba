import Link from "next/link";
import { StatCell, StatStrip } from "@/components/StatStrip";
import type { Finding } from "@/lib/findings";

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  return (
    <article className="data-card">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Finding {index + 1}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-zinc-900">
          {finding.headline}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          {finding.summary}
        </p>
        {finding.explainer && (
          <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-zinc-600">
            <span className="font-medium text-zinc-800">Why it matters: </span>
            {finding.explainer}
          </p>
        )}
      </div>

      {finding.stats.length > 0 && (
        <StatStrip>
          {finding.stats.map((stat) => (
            <StatCell
              key={stat.label}
              label={stat.label}
              value={stat.value}
              detail={stat.detail}
            />
          ))}
        </StatStrip>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border-subtle px-4 py-3">
        <p className="text-sm tabular-nums text-zinc-500">
          {finding.sampleNote}
        </p>
        {finding.links.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {finding.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function FindingsSection({
  findings,
  compact = false,
}: {
  findings: Finding[];
  compact?: boolean;
}) {
  if (findings.length === 0) return null;

  return (
    <section className={compact ? "" : "mb-10"}>
      {!compact && (
        <>
          <h2 className="text-base font-semibold text-zinc-800">Data findings</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Patterns across the full dataset — not tied to tonight&apos;s slate.
          </p>
        </>
      )}
      <div className={`space-y-3 ${compact ? "" : "mt-4"}`}>
        {findings.map((finding, index) => (
          <FindingCard key={finding.id} finding={finding} index={index} />
        ))}
      </div>
    </section>
  );
}
