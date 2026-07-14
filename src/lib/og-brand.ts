import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";

export const OG_LEAGUE_ACCENTS: Partial<Record<LeagueId, string>> = {
  nba: "#ef3b55",
  nhl: "#4d9fff",
  nfl: "#34d399",
  epl: "#a78bfa",
  laliga: "#fb923c",
  cbb: "#009CDE",
  cfb: "#009CDE",
};

export type BrandOgHighlight = {
  league: string;
  headline: string;
  heroValue: string;
  accent: string;
};

export type BrandOgContent = {
  title: string;
  subtitle: string;
  tagline: string;
  metrics: Array<{ label: string; value: string }>;
  leagues: Array<{ label: string; accent: string }>;
  highlights: BrandOgHighlight[];
  footer: string;
};

function formatMetric(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString("en-US");
}

export function brandOgContent(): BrandOgContent {
  const snapshot = loadOverviewSnapshot();

  return {
    title: "REF WATCH",
    subtitle: "Referee analytics & crew history",
    tagline: "Whistle tendencies, ref×team splits, and cross-league officiating intelligence.",
    metrics: [
      { label: "Officials", value: formatMetric(snapshot.totalRefs) },
      { label: "Games logged", value: formatMetric(snapshot.totalGames) },
      { label: snapshot.whistleLabel, value: formatMetric(snapshot.whistleEventsLogged) },
    ],
    leagues: snapshot.leagueCards
      .filter((card) =>
        (VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(card.leagueId),
      )
      .map((card) => ({
        label: card.shortLabel,
        accent: OG_LEAGUE_ACCENTS[card.leagueId] ?? "#4d9fff",
      })),
    highlights: snapshot.insightCards.slice(0, 3).map((card) => ({
      league: card.shortLabel,
      headline: card.headline,
      heroValue: card.heroValue,
      accent: OG_LEAGUE_ACCENTS[card.leagueId] ?? "#d8b85d",
    })),
    footer: "Independent analytics · refwatch.ca",
  };
}

export function leagueAccentFromOgTitle(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("nba")) return OG_LEAGUE_ACCENTS.nba!;
  if (normalized.includes("nhl")) return OG_LEAGUE_ACCENTS.nhl!;
  if (normalized.includes("nfl")) return OG_LEAGUE_ACCENTS.nfl!;
  if (normalized.includes("premier") || normalized.includes("epl"))
    return OG_LEAGUE_ACCENTS.epl!;
  if (normalized.includes("la liga") || normalized.includes("laliga"))
    return OG_LEAGUE_ACCENTS.laliga!;
  if (normalized.includes("basketball") || normalized.includes("cbb"))
    return OG_LEAGUE_ACCENTS.cbb!;
  if (normalized.includes("football") || normalized.includes("cfb"))
    return OG_LEAGUE_ACCENTS.cfb!;
  return "#0a5fa7";
}
