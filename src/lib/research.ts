import { computeAllFindings as computeNbaFindings } from "@/lib/findings";
import { computeAllFindings as computeNhlFindings } from "@/lib/nhl/findings";
import { computeAllFindings as computeNflFindings } from "@/lib/nfl/findings";
import { computeAllFindings as computeEplFindings } from "@/lib/epl/findings";
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
  return [...nba, ...nhl, ...nfl, ...epl];
}

export function computeResearchFindingsForLeague(
  league: FindingLeague,
): ResearchFinding[] {
  return filterFindingsByLeague(computeAllResearchFindings(), league);
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
