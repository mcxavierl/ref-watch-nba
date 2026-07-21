import type { HubHeroLeagueId } from "@/components/LeagueHubHero";

/** Dual ambient glow colors for league hub heroes (left + right orbs). */
export type LeagueHeroGlowTheme = {
  left: string;
  right: string;
};

/**
 * Per-league whistle-desk hero glow palette.
 * Values use rgb() with alpha for CSS custom properties.
 */
export const LEAGUE_HERO_GLOW_THEMES: Record<HubHeroLeagueId, LeagueHeroGlowTheme> = {
  laliga: {
    left: "rgb(245 158 11 / 0.2)",
    right: "rgb(220 38 38 / 0.25)",
  },
  epl: {
    left: "rgb(147 51 234 / 0.2)",
    right: "rgb(34 211 238 / 0.2)",
  },
  nba: {
    left: "rgb(37 99 235 / 0.2)",
    right: "rgb(220 38 38 / 0.2)",
  },
  wnba: {
    left: "rgb(245 158 11 / 0.2)",
    right: "rgb(249 115 22 / 0.25)",
  },
  nhl: {
    left: "rgb(6 182 212 / 0.2)",
    right: "rgb(203 213 225 / 0.15)",
  },
  nfl: {
    left: "rgb(30 64 175 / 0.25)",
    right: "rgb(148 163 184 / 0.2)",
  },
  cbb: {
    left: "rgb(79 70 229 / 0.2)",
    right: "rgb(251 191 36 / 0.2)",
  },
  cfb: {
    left: "rgb(79 70 229 / 0.2)",
    right: "rgb(217 119 6 / 0.22)",
  },
};

export function leagueHeroGlowTheme(leagueId: HubHeroLeagueId): LeagueHeroGlowTheme {
  return LEAGUE_HERO_GLOW_THEMES[leagueId];
}
