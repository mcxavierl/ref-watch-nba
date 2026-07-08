import { seasonLabelToBbrYear } from "../../src/lib/bbr-ref-team-records";
import { BBR_SEASONS, BBR_TEAM_ABBRS } from "./bbr-ref-team-records";

const BBR_SLUG: Record<string, string> = {
  BKN: "BRK",
  CHA: "CHO",
  PHX: "PHO",
};

export interface BbrPageTarget {
  team: string;
  season: string;
  bbrYear: number;
  slug: string;
  url: string;
}

export function bbrPageTargets(): BbrPageTarget[] {
  const targets: BbrPageTarget[] = [];
  for (const season of BBR_SEASONS) {
    const bbrYear = seasonLabelToBbrYear(season);
    for (const team of BBR_TEAM_ABBRS) {
      const slug = BBR_SLUG[team] ?? team;
      targets.push({
        team,
        season,
        bbrYear,
        slug,
        url: `https://www.basketball-reference.com/teams/${slug}/${bbrYear}_referees.html`,
      });
    }
  }
  return targets;
}
