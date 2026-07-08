import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { leagueHeroCopy } from "@/lib/league-hero-copy";
import { formatSeasonScope } from "@/lib/season-scope";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

type SlateLeagueId = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";

type LeagueSlateHeroProps = {
  leagueId: SlateLeagueId;
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
};

function formatStatCount(value: number | undefined): string {
  if (value == null || value === 0) return "—";
  return value.toLocaleString();
}

export function LeagueSlateHero({
  leagueId,
  assignments,
  refStats,
}: LeagueSlateHeroProps) {
  const config = LEAGUES[leagueId];
  const copy = leagueHeroCopy(leagueId);
  const isOffseason = assignments.games.length === 0;
  const officialCount = refStats.refs?.length ?? 0;
  const gamesProcessed = refStats.meta.totalGamesProcessed;
  const seasonSpan = formatSeasonScope(refStats.meta.seasons.length);

  return (
    <section
      className="page-hero page-hero-slate league-slate-hero"
      data-league={leagueId}
      aria-labelledby={`${leagueId}-slate-heading`}
    >
      <p className="league-slate-kicker">{copy.kicker}</p>
      <h1 className="page-title" id={`${leagueId}-slate-heading`}>
        {isOffseason ? copy.offseasonTitle : copy.liveTitle}
      </h1>
      <p className="page-lead">
        {isOffseason ? copy.offseasonLead : copy.liveLead}
      </p>

      <dl className="league-slate-stats" aria-label={`${config.dataLeague} dataset scope`}>
        <div className="league-slate-stat">
          <dt>{copy.statLabels.officials}</dt>
          <dd className="data-signal">
            {officialCount > 0 ? officialCount.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="league-slate-stat">
          <dt>{copy.statLabels.games}</dt>
          <dd className="data-signal">{formatStatCount(gamesProcessed)}</dd>
        </div>
        <div className="league-slate-stat">
          <dt>{copy.statLabels.seasons}</dt>
          <dd className="data-signal">{seasonSpan}</dd>
        </div>
      </dl>

      <DataFreshnessMeta
        assignments={assignments}
        refStats={refStats}
        league={
          config.dataLeague === "NBA" ||
          config.dataLeague === "NHL" ||
          config.dataLeague === "NFL" ||
          config.dataLeague === "CBB" ||
          config.dataLeague === "CFB"
            ? config.dataLeague
            : undefined
        }
      />
    </section>
  );
}

export type { SlateLeagueId };
