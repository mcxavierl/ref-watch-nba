import Link from "next/link";
import { StatCell, StatStrip } from "@/components/StatStrip";
import type { Finding } from "@/lib/findings-shared";
import { FINDING_CATEGORY_LABELS } from "@/lib/findings-shared";

export function FindingCard({
  finding,
  index,
  league,
}: {
  finding: Finding;
  index: number;
  league?: "NBA" | "NHL";
}) {
  return (
    <article className="data-card">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {league && <span>{league} · </span>}
          {FINDING_CATEGORY_LABELS[finding.category]} · Finding {index + 1}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-zinc-900">
          <Link
            href={`/research/${finding.id}`}
            className="hover:text-raptors hover:underline"
          >
            {finding.headline}
          </Link>
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
  featured = false,
  initialVisibleCount = 4,
  dataSourceNote,
}: {
  findings: Finding[];
  compact?: boolean;
  featured?: boolean;
  initialVisibleCount?: number;
  dataSourceNote?: string;
}) {
  if (findings.length === 0) return null;

  const visible = featured
    ? findings.slice(0, initialVisibleCount)
    : findings;
  const hidden = featured ? findings.slice(initialVisibleCount) : [];

  return (
    <section id="dataset-findings" className={compact && !featured ? "" : "mb-10 scroll-mt-24"}>
      {(featured || !compact) && (
        <>
          <h2 className="text-base font-bold text-zinc-900">
            Dataset findings
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Top patterns ranked by effect size and sample size — not tied to
            tonight&apos;s slate.
          </p>
          {dataSourceNote && (
            <p className="mt-2 text-xs text-zinc-500">{dataSourceNote}</p>
          )}
          <p className="mt-3">
            <Link
              href="/research"
              className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
            >
              View all findings →
            </Link>
          </p>
        </>
      )}
      <div className={`space-y-3 ${compact && !featured ? "" : "mt-4"}`}>
        {visible.map((finding, index) => (
          <FindingCard key={finding.id} finding={finding} index={index} />
        ))}
      </div>
      {hidden.length > 0 && (
        <details className="panel-inset mt-4 px-4 py-3 sm:px-5">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
            {hidden.length} more finding{hidden.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-4 space-y-3">
            {hidden.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                index={visible.length + index}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
