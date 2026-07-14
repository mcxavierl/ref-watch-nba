import type { LeagueId } from "@/lib/leagues";

export type HeroHighlightTone = "positive" | "negative";

export type HeroHighlightPart =
  | { type: "text"; value: string }
  | { type: "metric"; value: string };

export type DashboardHeroHighlight = {
  leagueId: LeagueId;
  leagueLabel: string;
  tone: HeroHighlightTone;
  official: string;
  parts: HeroHighlightPart[];
};

/** Curated high-confidence outlier patterns for the overview hero strip. */
export const DASHBOARD_HERO_HIGHLIGHTS: DashboardHeroHighlight[] = [
  {
    leagueId: "nba",
    leagueLabel: "NBA",
    tone: "positive",
    official: "Scott Foster",
    parts: [
      { type: "text", value: "Over bettors are " },
      { type: "metric", value: "72.1%" },
      { type: "text", value: " in Kings games (vs. " },
      { type: "metric", value: "54.1%" },
      { type: "text", value: " baseline). Sample: " },
      { type: "metric", value: "61" },
      { type: "text", value: " games." },
    ],
  },
  {
    leagueId: "nfl",
    leagueLabel: "NFL",
    tone: "negative",
    official: "Brad Allen",
    parts: [
      { type: "text", value: "Under bettors are " },
      { type: "metric", value: "65.4%" },
      { type: "text", value: " in 30-Game Sample (vs. " },
      { type: "metric", value: "48.2%" },
      { type: "text", value: " baseline)." },
    ],
  },
  {
    leagueId: "epl",
    leagueLabel: "EPL",
    tone: "positive",
    official: "Michael Oliver",
    parts: [
      { type: "text", value: "Total match cards are " },
      { type: "metric", value: "+1.2" },
      { type: "text", value: " per game vs. baseline." },
    ],
  },
  {
    leagueId: "laliga",
    leagueLabel: "La Liga",
    tone: "negative",
    official: "Alejandro J. H.",
    parts: [
      { type: "text", value: "Home teams score " },
      { type: "metric", value: "-0.9" },
      { type: "text", value: " goals vs. baseline in last " },
      { type: "metric", value: "10" },
      { type: "text", value: " matches." },
    ],
  },
];
