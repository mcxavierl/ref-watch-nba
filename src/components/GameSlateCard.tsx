import Link from "next/link";
import type { CrewMetrics } from "@/lib/data";
import { formatPct, refSlug } from "@/lib/data";
import { OuLeanBadge } from "./OuLeanBadge";
import { StatCell, StatStrip } from "./StatStrip";

export function GameSlateCard({
  matchup,
  awayTeam,
  homeTeam,
  metrics,
}: {
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  metrics: CrewMetrics;
}) {
  const isRaptors =
    awayTeam.toLowerCase().includes("toronto") ||
    homeTeam.toLowerCase().includes("toronto") ||
    awayTeam === "TOR" ||
    homeTeam === "TOR";

  const totalDelta =
    metrics.totalPointsDelta >= 0
      ? `+${metrics.totalPointsDelta}`
      : String(metrics.totalPointsDelta);
  const foulsDelta =
    metrics.foulsDelta >= 0
      ? `+${metrics.foulsDelta}`
      : String(metrics.foulsDelta);

  return (
    <article className="data-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-raised/60 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            {matchup}
          </h2>
          {isRaptors && (
            <Link
              href="/raptors"
              className="mt-1 inline-block text-[11px] font-medium text-raptors hover:underline"
            >
              Raptors crew splits →
            </Link>
          )}
        </div>
        <OuLeanBadge lean={metrics.ouLean} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border-subtle px-4 py-3">
        {metrics.crew.map((official) => (
          <Link
            key={`${official.name}-${official.number}`}
            href={`/refs/${refSlug(official.name, official.number)}`}
            className="rounded-md border border-border bg-white px-2.5 py-1.5 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <span className="block text-xs font-medium text-zinc-800">
              {official.name}
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              #{official.number} · {official.role.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>

      <StatStrip>
        <StatCell
          label="Avg total"
          value={String(metrics.avgTotalPoints)}
          detail={`${totalDelta} vs lg`}
        />
        <StatCell
          label="Over rate"
          value={formatPct(metrics.overRate)}
          detail="225 baseline"
        />
        <StatCell
          label="Avg fouls"
          value={String(metrics.avgFouls)}
          detail={`${foulsDelta} vs lg`}
        />
        <StatCell
          label="Sample"
          value={`${metrics.sampleGames}g`}
          detail={
            metrics.insufficientSample ? "< 2 qualified refs" : "per ref avg"
          }
        />
      </StatStrip>
    </article>
  );
}
