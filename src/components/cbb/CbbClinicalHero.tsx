import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { LEAGUE_HERO_STATS } from "@/lib/league-hero-stats.generated";
import { leagueHeroCopy } from "@/lib/league-hero-copy";
import { formatSeasonScope } from "@/lib/season-scope";
import {
  slateHeroStatHref,
  type SlateHeroStatKey,
} from "@/lib/slate-hero-links";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";
import "./cbb-clinical.css";

const SLATE_HERO_STAT_KEYS: SlateHeroStatKey[] = ["officials", "games", "seasons"];

function formatStatCount(value: number | undefined): string {
  if (value == null || value === 0) return "-";
  return value.toLocaleString();
}

function seasonCountFromSnapshot(seasonSpan: string | undefined): number {
  if (!seasonSpan) return 0;
  if (seasonSpan.toLowerCase().includes("this season")) return 1;
  const match = seasonSpan.match(/(\d+)/);
  return match ? Number.parseInt(match[1]!, 10) : 0;
}

type CbbClinicalHeroProps = {
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
};

export function CbbClinicalHero({ assignments, refStats }: CbbClinicalHeroProps) {
  const copy = leagueHeroCopy("cbb");
  const snapshot = LEAGUE_HERO_STATS.cbb;
  const officialCount = refStats.refs?.length || snapshot?.officials || 0;
  const gamesProcessed = refStats.meta.totalGamesProcessed || snapshot?.games || 0;
  const seasonSpan =
    refStats.meta.seasons.length > 0
      ? formatSeasonScope(refStats.meta.seasons.length)
      : (snapshot?.seasonSpan ?? "-");
  const seasonCount =
    refStats.meta.seasons.length > 0
      ? refStats.meta.seasons.length
      : seasonCountFromSnapshot(snapshot?.seasonSpan);

  const statValues = {
    officials: officialCount > 0 ? officialCount.toLocaleString() : "-",
    games: formatStatCount(gamesProcessed),
    seasons: seasonSpan,
  };

  return (
    <header className="cbb-clinical-hero" aria-labelledby="cbb-clinical-heading">
      <p className="cbb-clinical-kicker">{copy.kicker}</p>
      <h1 className="cbb-clinical-title" id="cbb-clinical-heading">
        {copy.offseasonTitle}
      </h1>
      <p className="cbb-clinical-lead">{copy.offseasonLead}</p>

      <div
        className="cbb-clinical-panel cbb-clinical-stats-panel"
        aria-label="CBB dataset scope"
        role="group"
      >
        {SLATE_HERO_STAT_KEYS.map((key) => (
          <Link
            key={key}
            href={slateHeroStatHref("cbb", key, seasonCount)}
            className="cbb-clinical-stat"
          >
            <span className="cbb-clinical-stat-label">{copy.statLabels[key]}</span>
            <span className="cbb-clinical-stat-value tabular-nums">{statValues[key]}</span>
          </Link>
        ))}
      </div>

      <DataFreshnessMeta assignments={assignments} refStats={refStats} league="CBB" />
    </header>
  );
}
