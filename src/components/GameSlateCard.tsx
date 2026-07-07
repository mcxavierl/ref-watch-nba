import Link from "next/link";
import type { CrewMetrics } from "@/lib/data";
import { detectTeamsInGame, formatPct, refSlug } from "@/lib/data";
import { getOuLeanAnnotationFromDelta } from "@/lib/leanAnnotations";
import { teamFullName } from "@/lib/teams";
import { TeamLogo } from "./TeamLogo";
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
  const teams = detectTeamsInGame(awayTeam, homeTeam);

  const totalDelta =
    metrics.totalPointsDelta >= 0
      ? `+${metrics.totalPointsDelta}`
      : String(metrics.totalPointsDelta);
  const foulsDelta =
    metrics.foulsDelta >= 0
      ? `+${metrics.foulsDelta}`
      : String(metrics.foulsDelta);
  const ouLean = getOuLeanAnnotationFromDelta(
    metrics.overRate,
    metrics.totalPointsDelta,
  );

  return (
    <article className="data-card">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {teams.length > 0 ? (
            <div className="flex items-center gap-2">
              {teams.map((team, i) => (
                <span key={team.abbr} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-xs text-zinc-400" aria-hidden>
                      vs
                    </span>
                  )}
                  <TeamLogo team={team} size="sm" />
                  <span className="text-base font-semibold tracking-tight text-zinc-900">
                    {team.abbr}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">
              {matchup}
            </h2>
          )}
        </div>
        {teams.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {teams.map((team) => (
              <Link
                key={team.abbr}
                href={`/teams/${team.abbr}`}
                className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900 hover:underline"
              >
                {teamFullName(team)} crew history →
              </Link>
            ))}
          </div>
        )}
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
          label="Avg combined score"
          value={String(metrics.avgTotalPoints)}
          detail={`${totalDelta} vs league avg`}
          annotation={ouLean?.target === "avgTotal" ? ouLean.label : undefined}
        />
        <StatCell
          label="Games over 225 pts"
          value={formatPct(metrics.overRate)}
          detail="Combined score beat benchmark"
          annotation={
            ouLean?.target === "overRate" ? ouLean.label : undefined
          }
        />
        <StatCell
          label="Fouls per game"
          value={String(metrics.avgFouls)}
          detail={`${foulsDelta} vs league avg`}
        />
        <StatCell
          label="Sample size"
          value={`${metrics.sampleGames}g`}
          detail={
            metrics.insufficientSample
              ? "Fewer than 2 refs with enough games"
              : "Average across crew"
          }
        />
      </StatStrip>
    </article>
  );
}
