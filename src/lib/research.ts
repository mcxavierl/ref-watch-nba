import { computeAllFindings as computeNbaFindings } from "@/lib/findings";
import { computeAllFindings as computeNhlFindings } from "@/lib/nhl/findings";
import { computeAllFindings as computeNflFindings } from "@/lib/nfl/findings";
import { computeAllFindings as computeLaligaFindings } from "@/lib/laliga/findings";
import { computeAllFindings as computeEplFindings } from "@/lib/epl/findings";
import { computeAllFindings as computeCbbFindings } from "@/lib/cbb/findings";
import { computeAllFindings as computeCfbFindings } from "@/lib/cfb/findings";
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
  const finding = computeAllResearchFindings().find((f) => f.id === id);
  if (!finding) return undefined;
  return { ...finding, league: inferFindingLeague(finding) };
}

export function getAllResearchFindingIds(): string[] {
  return computeAllResearchFindings().map((f) => f.id);
}

export function getResearchFindingIdsForLeague(
  league: FindingLeague,
): string[] {
  return computeResearchFindingsForLeague(league).map((f) => f.id);
}
