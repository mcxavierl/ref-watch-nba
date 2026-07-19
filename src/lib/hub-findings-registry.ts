import { computeFindings as computeNbaFindings } from "@/lib/findings";
import { computeFindings as computeCbbFindings } from "@/lib/cbb/findings";
import { computeFindings as computeCfbFindings } from "@/lib/cfb/findings";
import { computeFindings as computeEplFindings } from "@/lib/epl/findings";
import { computeFindings as computeLaligaFindings } from "@/lib/laliga/findings";
import { computeFindings as computeNflFindings } from "@/lib/nfl/findings";
import { computeFindings as computeNhlFindings } from "@/lib/nhl/findings";
import type { Finding } from "@/lib/findings-shared";
import type { InsightsLeagueId } from "@/lib/league-manifest";

export type HubFindingsComputer = (
  limit: number,
  scopedSeasons: string[],
) => Finding[];

export const HUB_FINDINGS_COMPUTERS: Record<InsightsLeagueId, HubFindingsComputer> = {
  nba: (limit, scopedSeasons) =>
    computeNbaFindings(limit, scopedSeasons, { hub: true }),
  nhl: (limit, scopedSeasons) =>
    computeNhlFindings(limit, scopedSeasons, { hub: true }),
  nfl: (limit, scopedSeasons) =>
    computeNflFindings(limit, scopedSeasons, { hub: true }),
  epl: (limit, scopedSeasons) =>
    computeEplFindings(limit, scopedSeasons, { hub: true }),
  laliga: (limit, scopedSeasons) =>
    computeLaligaFindings(limit, scopedSeasons, { hub: true }),
  cbb: (limit, scopedSeasons) =>
    computeCbbFindings(limit, scopedSeasons, { hub: true }),
  cfb: (limit, scopedSeasons) =>
    computeCfbFindings(limit, scopedSeasons, { hub: true }),
};

export function computeHubFindings(
  leagueId: InsightsLeagueId,
  limit: number,
  scopedSeasons: string[],
): Finding[] {
  return HUB_FINDINGS_COMPUTERS[leagueId](limit, scopedSeasons);
}
