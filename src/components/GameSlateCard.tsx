import Link from "next/link";
import type { CrewMetrics } from "@/lib/data";
import { detectTrackedTeams, formatPct, refSlug } from "@/lib/data";
import { OuLeanBadge } from "./OuLeanBadge";
import { StatCell, StatStrip } from "./StatStrip";

export function GameSlateCard({
  matchup,
  awayTeam,
  homeTeam,
  metrics,
  featured = false,
}: {
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  metrics: CrewMetrics;
  featured?: boolean;
}) {
  const trackedTeams = detectTrackedTeams(awayTeam, homeTeam);
  const cardRing =
    trackedTeams.length === 1
      ? trackedTeams[0].cardRing
      : trackedTeams.length > 1
        ? "ring-zinc-400/40"
        : "";

  const totalDelta =
    metrics.totalPointsDelta >= 0
      ? `+${metrics.totalPointsDelta}`
      : String(metrics.totalPointsDelta);
  const foulsDelta =
    metrics.foulsDelta >= 0
      ? `+${metrics.foulsDelta}`
      : String(metrics.foulsDelta);

  return (
    <article
      className={`data-card ${featured || trackedTeams.length > 0 ? `ring-2 ${cardRing}` : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-raised/60 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">
              {matchup}
            </h2>
            {featured && (
              <span className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Tracked team
              </span>
            )}
          </div>
          {trackedTeams.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {trackedTeams.map((team) => (
                <Link
                  key={team.key}
                  href={team.href}
                  className={`text-[11px] font-medium ${team.linkClass} hover:underline`}
                >
                  {team.label} crew splits →
                </Link>
              ))}
            </div>
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
