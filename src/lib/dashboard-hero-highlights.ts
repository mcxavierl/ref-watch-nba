import type { LeagueId } from "@/lib/leagues";
import { LEAGUES } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import {
  buildRankingsSynthesis,
  type RankingsInsight,
} from "@/lib/rankings-synthesis";

export type HeroHighlightTone = "positive" | "negative";

export type HeroHighlightPart =
  | { type: "text"; value: string }
  | { type: "metric"; value: string };

export type DashboardHeroHighlight = {
  id: string;
  leagueId: LeagueId;
  leagueLabel: string;
  tone: HeroHighlightTone;
  official: string;
  href?: string;
  parts: HeroHighlightPart[];
};

const HERO_LEAGUE_ORDER: LeagueId[] = ["nba", "nfl", "epl", "laliga"];

function heroToneForInsight(insight: RankingsInsight): HeroHighlightTone {
  if (/under|light|dip|lowest/i.test(insight.title)) return "negative";
  return "positive";
}

function heroPartsFromInsight(insight: RankingsInsight): HeroHighlightPart[] {
  if (insight.statValue) {
    return [
      { type: "text", value: `${insight.body} ` },
      { type: "metric", value: insight.statValue },
      { type: "text", value: "." },
    ];
  }
  return [{ type: "text", value: `${insight.title}. ${insight.body}` }];
}

/** Build gated hero highlights from live league rankings synthesis. */
export function buildDashboardHeroHighlights(limit = 4): DashboardHeroHighlight[] {
  const highlights: DashboardHeroHighlight[] = [];

  for (const leagueId of HERO_LEAGUE_ORDER) {
    if (highlights.length >= limit) break;
    const league = LEAGUES[leagueId];
    const { stats } = loadLeagueStats(leagueId);
    const synthesis = buildRankingsSynthesis(stats, league, { maxCards: 1 });
    const insight = synthesis.insights.find((entry) => entry.refSlug && entry.refName);
    if (!insight?.refSlug || !insight.refName) continue;

    highlights.push({
      id: `hero-${leagueId}-${insight.refSlug}`,
      leagueId,
      leagueLabel: league.shortLabel,
      tone: heroToneForInsight(insight),
      official: insight.refName,
      href: `/${leagueId}/refs/${insight.refSlug}`,
      parts: heroPartsFromInsight(insight),
    });
  }

  return highlights;
}

/** Gated overview hero strip — derived from rankings synthesis, not static copy. */
export const DASHBOARD_HERO_HIGHLIGHTS = buildDashboardHeroHighlights();
