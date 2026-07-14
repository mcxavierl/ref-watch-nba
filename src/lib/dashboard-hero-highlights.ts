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
      { type: "text", value: "Over bettors hit " },
      { type: "metric", value: "72.1%" },
      { type: "text", value: " in Kings matches (vs. " },
      { type: "metric", value: "54.1%" },
      { type: "text", value: " baseline across " },
      { type: "metric", value: "61" },
      { type: "text", value: " matches." },
    ],
  },
  {
    leagueId: "nfl",
    leagueLabel: "NFL",
    tone: "negative",
    official: "Brad Allen",
    parts: [
      { type: "text", value: "Under bettors hit " },
      { type: "metric", value: "65.4%" },
      { type: "text", value: " across " },
      { type: "metric", value: "30" },
      { type: "text", value: " matches (vs. " },
      { type: "metric", value: "48.2%" },
      { type: "text", value: " baseline)." },
    ],
  },
  {
    leagueId: "cbb",
    leagueLabel: "CBB",
    tone: "negative",
    official: "Tony Henderson",
    parts: [
      { type: "text", value: "Marquette trails baseline by " },
      { type: "metric", value: "49.4pp" },
      { type: "text", value: " win rate across " },
      { type: "metric", value: "8" },
      { type: "text", value: " games (vs. " },
      { type: "metric", value: "61.9%" },
      { type: "text", value: " team norm)." },
    ],
  },
  {
    leagueId: "cfb",
    leagueLabel: "CFB",
    tone: "negative",
    official: "Bill Vinovich",
    parts: [
      { type: "text", value: "Alabama trails baseline by " },
      { type: "metric", value: "18.4pp" },
      { type: "text", value: " win rate across " },
      { type: "metric", value: "9" },
      { type: "text", value: " games (vs. " },
      { type: "metric", value: "73.9%" },
      { type: "text", value: " team norm)." },
    ],
  },
  {
    leagueId: "epl",
    leagueLabel: "EPL",
    tone: "positive",
    official: "Michael Oliver",
    parts: [
      { type: "text", value: "Cards run " },
      { type: "metric", value: "+1.2" },
      { type: "text", value: " per match vs. league baseline." },
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
      { type: "text", value: " goals vs. baseline in " },
      { type: "metric", value: "10" },
      { type: "text", value: " recent matches." },
    ],
  },
];
