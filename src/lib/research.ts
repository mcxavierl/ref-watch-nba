import { computeAllFindings as computeNbaFindings, computeFindings as computeNbaFindingsLimited } from "@/lib/findings";
import { computeAllFindings as computeNhlFindings, computeFindings as computeNhlFindingsLimited } from "@/lib/nhl/findings";
import { computeAllFindings as computeNflFindings, computeFindings as computeNflFindingsLimited } from "@/lib/nfl/findings";
import { computeAllFindings as computeLaligaFindings, computeFindings as computeLaligaFindingsLimited } from "@/lib/laliga/findings";
import { computeAllFindings as computeEplFindings, computeFindings as computeEplFindingsLimited } from "@/lib/epl/findings";
import { computeAllFindings as computeCbbFindings, computeFindings as computeCbbFindingsLimited } from "@/lib/cbb/findings";
import { computeAllFindings as computeCfbFindings, computeFindings as computeCfbFindingsLimited } from "@/lib/cfb/findings";
import type { Finding } from "@/lib/findings-shared";
import {
  filterFindingsByLeague,
  inferFindingLeague,
  type FindingLeague,
} from "@/lib/findings-shared";

export interface ResearchFinding extends Finding {
  league: FindingLeague;
}

function tagResearchFindings(
  findings: Finding[],
  league: FindingLeague,
): ResearchFinding[] {
  return filterFindingsByLeague(findings, league).map((finding) => ({
    ...finding,
    league,
  }));
}

export function computeAllResearchFindings(): ResearchFinding[] {
  const nba = tagResearchFindings(computeNbaFindings(), "NBA");
  const nhl = tagResearchFindings(computeNhlFindings(), "NHL");
  const nfl = tagResearchFindings(computeNflFindings(), "NFL");
  const epl = tagResearchFindings(computeEplFindings(), "EPL");
  const cbb = tagResearchFindings(computeCbbFindings(), "CBB");
  const cfb = tagResearchFindings(computeCfbFindings(), "CFB");
  const laliga = tagResearchFindings(computeLaligaFindings(), "LALIGA");
  return [...nba, ...nhl, ...nfl, ...epl, ...laliga, ...cbb, ...cfb];
}

const LEAGUE_FINDING_COMPUTERS: Partial<
  Record<
    FindingLeague,
    (scopedSeasons?: string[], options?: { hub?: boolean }) => Finding[]
  >
> = {
  NBA: computeNbaFindings,
  NHL: computeNhlFindings,
  NFL: computeNflFindings,
  EPL: computeEplFindings,
  LALIGA: computeLaligaFindings,
  CBB: computeCbbFindings,
  CFB: computeCfbFindings,
};

/** Worker-safe lookup: hub-ranked pool first; full league scan only when needed. */
const LEAGUE_HUB_FINDING_COMPUTERS: Partial<
  Record<FindingLeague, (scopedSeasons?: string[]) => Finding[]>
> = {
  NBA: (scopedSeasons) => computeNbaFindingsLimited(48, scopedSeasons, { hub: true }),
  NHL: (scopedSeasons) => computeNhlFindingsLimited(48, scopedSeasons, { hub: true }),
  NFL: (scopedSeasons) => computeNflFindingsLimited(48, scopedSeasons, { hub: true }),
  EPL: (scopedSeasons) => computeEplFindingsLimited(48, scopedSeasons, { hub: true }),
  LALIGA: (scopedSeasons) =>
    computeLaligaFindingsLimited(48, scopedSeasons, { hub: true }),
  CBB: (scopedSeasons) => computeCbbFindingsLimited(48, scopedSeasons, { hub: true }),
  CFB: (scopedSeasons) => computeCfbFindingsLimited(48, scopedSeasons, { hub: true }),
};

export function computeResearchFindingsForLeague(
  league: FindingLeague,
  scopedSeasons?: string[],
  options?: { hub?: boolean },
): ResearchFinding[] {
  const compute = LEAGUE_FINDING_COMPUTERS[league];
  if (!compute) return [];
  return tagResearchFindings(compute(scopedSeasons, options), league);
}

export function getResearchFindingById(
  id: string,
): ResearchFinding | undefined {
  const league = inferFindingLeague({ id } as Finding);
  const hubCompute = LEAGUE_HUB_FINDING_COMPUTERS[league];
  const fullCompute = LEAGUE_FINDING_COMPUTERS[league];
  if (!hubCompute || !fullCompute) return undefined;

  const hubMatch = tagResearchFindings(hubCompute(), league).find(
    (f) => f.id === id,
  );
  if (hubMatch) return hubMatch;

  const finding = tagResearchFindings(fullCompute(), league).find(
    (f) => f.id === id,
  );
  if (!finding) return undefined;
  return finding;
}

/** Sitemap-safe: hub-ranked findings only — never scan all leagues with full builders. */
export function getAllResearchFindingIds(): string[] {
  const leagues: FindingLeague[] = [
    "NBA",
    "NHL",
    "NFL",
    "EPL",
    "LALIGA",
    "CBB",
    "CFB",
  ];
  return leagues.flatMap((league) =>
    computeResearchFindingsForLeague(league, undefined, { hub: true }).map(
      (f) => f.id,
    ),
  );
}

export function getResearchFindingIdsForLeague(
  league: FindingLeague,
): string[] {
  return computeResearchFindingsForLeague(league).map((f) => f.id);
}
