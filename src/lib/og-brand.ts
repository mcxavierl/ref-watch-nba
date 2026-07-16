import type {
  LeagueInsightCard,
  LeagueInsightTone,
} from "@/lib/league-overview-insights";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { isVerifiedLiveLeague } from "@/lib/league-verification";
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

export const OG_NHL_CARD_BG = "rgba(10, 76, 122, 0.2)";

export const OG_LEAGUE_CARD_BACKGROUNDS: Partial<Record<LeagueId, string>> = {
  nhl: OG_NHL_CARD_BG,
};

export const OG_DELTA_POSITIVE = "#34d399";
export const OG_DELTA_NEGATIVE = "#ef4444";

export const OG_FOOTER_LINE = "Verified officiating analytics | Ref Watch";

export type BrandOgHighlight = {
  league: string;
  headline: string;
  heroValue: string;
  accent: string;
  heroTone: LeagueInsightTone;
  cardBackground?: string;
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

function parseDeltaPp(heroValue: string): number | null {
  const match = heroValue.match(/^([+-]?)(\d+(?:\.\d+)?)pp$/i);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * Number.parseFloat(match[2]);
}

function formatAbsoluteDeltaPp(heroValue: string): string {
  const delta = parseDeltaPp(heroValue);
  if (delta === null) return heroValue.replace(/^-/, "+");
  return `+${Math.abs(delta).toFixed(1)}pp`;
}

function matrixEdgeOgHeadline(card: LeagueInsightCard): string {
  if (card.entityName && card.teamLabel) {
    return `${card.entityName} boosts ${card.teamLabel} baseline`;
  }
  return card.headline.replace(/\b(trails|beats|drags)\b/gi, "boosts");
}

/** Normalize matrix-edge highlights so OG hero values and headlines stay consistent. */
export function formatOgHighlight(card: LeagueInsightCard): BrandOgHighlight {
  const accent = OG_LEAGUE_ACCENTS[card.leagueId] ?? "#d8b85d";
  const cardBackground = OG_LEAGUE_CARD_BACKGROUNDS[card.leagueId];

  if (card.kind === "matrix-edge") {
    return {
      league: card.shortLabel,
      headline: matrixEdgeOgHeadline(card),
      heroValue: formatAbsoluteDeltaPp(card.heroValue),
      accent,
      heroTone: "positive",
      cardBackground,
    };
  }

  return {
    league: card.shortLabel,
    headline: card.headline,
    heroValue: card.heroValue,
    accent,
    heroTone: card.heroTone,
    cardBackground,
  };
}

function formatMetric(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString("en-US");
}

export function brandOgContent(): BrandOgContent {
  const snapshot = loadOverviewSnapshot();

  return {
    title: "REF WATCH",
    subtitle: "Referee analytics and historical tendencies",
    tagline: "Whistle tendencies, ref×team splits, and cross-league officiating intelligence.",
    metrics: [
      { label: "Officials", value: formatMetric(snapshot.totalRefs) },
      { label: "Games logged", value: formatMetric(snapshot.totalGames) },
      { label: snapshot.whistleLabel, value: formatMetric(snapshot.whistleEventsLogged) },
    ],
    leagues: snapshot.leagueCards
      .filter((card) =>
        isVerifiedLiveLeague(card.leagueId),
      )
      .map((card) => ({
        label: card.shortLabel,
        accent: OG_LEAGUE_ACCENTS[card.leagueId] ?? "#4d9fff",
      })),
    highlights: snapshot.insightCards.slice(0, 3).map(formatOgHighlight),
    footer: OG_FOOTER_LINE,
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
