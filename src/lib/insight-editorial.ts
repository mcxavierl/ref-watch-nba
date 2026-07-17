import {
  dataMaturityPercent,
  displayWinRateDelta,
  formatDeltaPp,
  formatSampleSizeLabel,
  isPreliminarySample,
} from "@/lib/data-maturity";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

export type EditorialMetric = {
  value: string;
  label: string;
};

export type EditorialInsightView = {
  headline: string;
  primaryMetric: EditorialMetric;
  secondaryMetric: EditorialMetric | null;
  whyItMatters: string;
  sampleGames: number;
  isPreliminary: boolean;
  isAdjusted: boolean;
  showHonestyFootnote: boolean;
};

export type InsightMetricComparison = {
  /** Bar magnitude for the crew / delta row. */
  crewValue: number;
  /** Bar magnitude for the league / baseline row. */
  leagueValue: number;
  crewLabel: string;
  leagueLabel: string;
  format: "pct" | "decimal";
  /** Ref×team matrix split: delta vs team baseline (percentage points). */
  deltaPp?: number;
  refWinRate?: number;
  teamBaseline?: number;
};

function normalizeCopy(text: string): string {
  return text.replace(/\u2014|\u2013/g, " - ");
}

function headlineLooksNarrative(headline: string): boolean {
  const lower = headline.toLowerCase();
  return (
    headline.length >= 48 ||
    lower.includes(" is showing ") ||
    lower.includes(" is pacing ") ||
    lower.includes(" calls ") ||
    lower.includes(" runs ")
  );
}

/** Human-first headline for insight surfaces (featured, trends, quick lists). */
export function humanCentricHeadline(card: LeagueInsightCard): string {
  if (headlineLooksNarrative(card.headline)) {
    return normalizeCopy(card.headline);
  }

  const name = card.entityName?.trim();
  const league = card.shortLabel;
  const team = card.teamLabel?.trim();

  if (card.kind === "ref-outlier" && name) {
    const label = card.heroLabel.toLowerCase();
    if (label.includes("flag") || label.includes("foul") || label.includes("minor")) {
      const intensity =
        card.heroTone === "positive"
          ? "highest"
          : card.heroTone === "negative"
            ? "lowest"
            : "most unusual";
      return `${name} calls one of the ${league}'s ${intensity} whistle rates`;
    }
    return `${name} leads ${league} ${card.heroLabel.toLowerCase()} this season`;
  }

  if (card.kind === "matrix-edge" && name && team) {
    const verb =
      card.heroTone === "positive"
        ? "boosts"
        : card.heroTone === "negative"
          ? "drags"
          : "shifts";
    return `${name} ${verb} ${team} results vs the ${league} baseline`;
  }

  if (name && team) {
    return `${name} and ${team} show the clearest ${league} split on record`;
  }

  if (name) {
    return `${name} anchors the top ${league} story this week`;
  }

  return normalizeCopy(card.headline);
}

function metricFromStats(
  card: LeagueInsightCard,
  index: number,
): EditorialMetric | null {
  const stat = card.stats[index];
  if (!stat?.value || stat.value === "n/a") return null;
  return { value: stat.value, label: stat.label };
}

function parseDeltaPpFromCard(card: LeagueInsightCard): number | null {
  const heroDelta = parseNumericToken(card.heroValue);
  if (heroDelta !== null && /pp|baseline|win rate|delta/i.test(card.heroLabel)) {
    return heroDelta;
  }

  if (card.kind === "matrix-edge") {
    const baselineStat = card.stats.find((stat) => /baseline/i.test(stat.label));
    const recordStat = card.stats.find((stat) => /record/i.test(stat.label));
    const baselinePct = baselineStat ? parsePctToken(baselineStat.value) : null;
    const recordWinRate = recordStat ? winRateFromRecord(recordStat.value) : null;
    if (baselinePct !== null && recordWinRate !== null) {
      return recordWinRate - baselinePct;
    }
    return heroDelta;
  }

  return null;
}

function splitDisplayMetrics(card: LeagueInsightCard): {
  primaryMetric: EditorialMetric;
  secondaryMetric: EditorialMetric | null;
  sampleGames: number;
  isPreliminary: boolean;
  isAdjusted: boolean;
  showHonestyFootnote: boolean;
} {
  const sampleGames = parseGamesFromCard(card);
  const rawDelta = parseDeltaPpFromCard(card);
  const usesSplitHierarchy =
    card.kind === "matrix-edge" || (rawDelta !== null && isPreliminarySample(sampleGames));

  if (usesSplitHierarchy && rawDelta !== null && sampleGames > 0) {
    const { displayDelta, isPreliminary, isAdjusted } = displayWinRateDelta(
      rawDelta,
      sampleGames,
    );
    return {
      primaryMetric: {
        value: formatSampleSizeLabel(sampleGames),
        label: "Sample size",
      },
      secondaryMetric: {
        value: formatDeltaPp(displayDelta),
        label: "Win rate delta",
      },
      sampleGames,
      isPreliminary,
      isAdjusted,
      showHonestyFootnote: isAdjusted,
    };
  }

  const primaryMetric: EditorialMetric = {
    value: card.heroValue,
    label: card.heroLabel,
  };
  const secondaryMetric =
    metricFromStats(card, 0) ??
    metricFromStats(card, 1) ??
    null;
  const secondaryDistinct =
    secondaryMetric &&
    secondaryMetric.value !== primaryMetric.value &&
    secondaryMetric.label !== primaryMetric.label
      ? secondaryMetric
      : metricFromStats(card, 1);

  return {
    primaryMetric,
    secondaryMetric:
      secondaryDistinct &&
      secondaryDistinct.value !== primaryMetric.value &&
      secondaryDistinct.label !== primaryMetric.label
        ? secondaryDistinct
        : null,
    sampleGames,
    isPreliminary: isPreliminarySample(sampleGames),
    isAdjusted: false,
    showHonestyFootnote: false,
  };
}

/** Standard editorial stack: headline, two metrics, and a short why-it-matters blurb. */
export function editorialInsightView(card: LeagueInsightCard): EditorialInsightView {
  const metrics = splitDisplayMetrics(card);
  const whyItMatters = normalizeCopy(card.story.trim());

  return {
    headline: humanCentricHeadline(card),
    primaryMetric: metrics.primaryMetric,
    secondaryMetric: metrics.secondaryMetric,
    whyItMatters,
    sampleGames: metrics.sampleGames,
    isPreliminary: metrics.isPreliminary,
    isAdjusted: metrics.isAdjusted,
    showHonestyFootnote: metrics.showHonestyFootnote,
  };
}

function heroValueMagnitude(value: string): number {
  const match = value.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Math.abs(Number.parseFloat(match[1]));
}

/** Pick the strongest card for the full-width featured insight slot. */
export function pickTopInsightCard(cards: LeagueInsightCard[]): LeagueInsightCard | null {
  if (cards.length === 0) return null;
  return [...cards].sort(
    (a, b) => heroValueMagnitude(b.heroValue) - heroValueMagnitude(a.heroValue),
  )[0]!;
}

/** Stable dedupe key for ref×team insight cards. */
export function insightCardKey(card: LeagueInsightCard): string {
  return `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
}

const OVERVIEW_STANDOUT_LEAGUE_ORDER: LeagueInsightCard["leagueId"][] = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
];

const OVERVIEW_EXTRA_STANDOUT_LEAGUES = new Set<LeagueInsightCard["leagueId"]>([
  "nba",
  "nfl",
  "epl",
]);

/** Homepage grid: one split per league plus a second NBA, NFL, and EPL sample. */
export function overviewStandoutSplitCards(
  cards: LeagueInsightCard[],
  featured: LeagueInsightCard | null,
): LeagueInsightCard[] {
  const used = new Set<string>();
  if (featured) used.add(insightCardKey(featured));

  const matrixCards = cards.filter((card) => card.kind === "matrix-edge");
  const byLeague = new Map<string, LeagueInsightCard[]>();

  for (const card of matrixCards) {
    const list = byLeague.get(card.leagueId) ?? [];
    list.push(card);
    byLeague.set(card.leagueId, list);
  }

  for (const list of byLeague.values()) {
    list.sort((a, b) => {
      const gamesA = parseGamesFromCard(a);
      const gamesB = parseGamesFromCard(b);
      if (gamesB !== gamesA) return gamesB - gamesA;
      return heroValueMagnitude(b.heroValue) - heroValueMagnitude(a.heroValue);
    });
  }

  const result: LeagueInsightCard[] = [];

  function takeNext(leagueId: LeagueInsightCard["leagueId"]): LeagueInsightCard | null {
    const list = byLeague.get(leagueId) ?? [];
    for (const card of list) {
      const key = insightCardKey(card);
      if (used.has(key)) continue;
      used.add(key);
      return card;
    }
    return null;
  }

  for (const leagueId of OVERVIEW_STANDOUT_LEAGUE_ORDER) {
    const card = takeNext(leagueId);
    if (card) result.push(card);
  }

  for (const leagueId of OVERVIEW_EXTRA_STANDOUT_LEAGUES) {
    const card = takeNext(leagueId);
    if (card) result.push(card);
  }

  return result;
}

/** One trend card per league for compact surfaces. */
export function trendInsightCards(cards: LeagueInsightCard[]): LeagueInsightCard[] {
  const byLeague = new Map<string, LeagueInsightCard>();
  for (const card of cards) {
    if (!byLeague.has(card.leagueId)) {
      byLeague.set(card.leagueId, card);
    }
  }
  return [...byLeague.values()];
}

/** Compact quick-insight row (up to three cards). */
export function quickInsightCards(cards: LeagueInsightCard[], limit = 3): LeagueInsightCard[] {
  return [...cards]
    .sort((a, b) => heroValueMagnitude(b.heroValue) - heroValueMagnitude(a.heroValue))
    .slice(0, limit);
}

/** Crew spotlight cards: top stories after the featured insight, de-duplicated. */
export function spotlightInsightCards(
  topInsight: LeagueInsightCard | null,
  candidates: LeagueInsightCard[],
  limit = 3,
): LeagueInsightCard[] {
  const topInsightKey = topInsight
    ? `${topInsight.leagueId}:${topInsight.refSlug ?? topInsight.headline}:${topInsight.teamAbbr ?? ""}`
    : "";
  const seen = new Set<string>();
  const result: LeagueInsightCard[] = [];

  for (const card of candidates) {
    const key = `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
    if (key === topInsightKey || seen.has(key)) continue;
    seen.add(key);
    result.push(card);
    if (result.length >= limit) break;
  }

  return result;
}

function parseNumericToken(value: string): number | null {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePctToken(value: string): number | null {
  const pctMatch = value.match(/([\d.]+)\s*%/);
  if (pctMatch) {
    const parsed = Number.parseFloat(pctMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return parseNumericToken(value);
}

export function parseGamesFromCard(card: LeagueInsightCard): number {
  for (const stat of card.stats) {
    if (!/games|sample/i.test(stat.label)) continue;
    const parsed = parseNumericToken(stat.value);
    if (parsed !== null && parsed > 0) return Math.round(parsed);
  }

  const storyMatch = card.story.match(/(\d+)\s+(?:verified\s+)?games/i);
  if (storyMatch) return Number.parseInt(storyMatch[1], 10);

  return 0;
}

function winRateFromRecord(value: string): number | null {
  const match = value.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  const wins = Number.parseInt(match[1], 10);
  const losses = Number.parseInt(match[2], 10);
  const games = wins + losses;
  if (games <= 0) return null;
  return (wins / games) * 100;
}

function metricLabelFromHero(card: LeagueInsightCard): string {
  return card.heroLabel
    .replace(/\s*variance\s*vs\s*league\s*/i, " ")
    .replace(/\s*vs\s*team\s*baseline\s*/i, " ")
    .trim();
}

/** Side-by-side crew vs league/baseline values for mini comparison bars. */
export function insightMetricComparison(
  card: LeagueInsightCard,
): InsightMetricComparison | null {
  if (card.kind === "matrix-edge") {
    const baselineStat = card.stats.find((stat) => /baseline/i.test(stat.label));
    const recordStat = card.stats.find((stat) => /record/i.test(stat.label));
    const baselinePct = baselineStat ? parsePctToken(baselineStat.value) : null;

    if (baselinePct !== null) {
      const recordWinRate = recordStat ? winRateFromRecord(recordStat.value) : null;
      const heroDelta = parseNumericToken(card.heroValue);
      const rawDeltaPp =
        heroDelta ??
        (recordWinRate !== null ? recordWinRate - baselinePct : null);
      const sampleGames = parseGamesFromCard(card);
      const deltaPp =
        rawDeltaPp !== null
          ? displayWinRateDelta(rawDeltaPp, sampleGames).displayDelta
          : null;

      if (deltaPp !== null && recordWinRate !== null) {
        return {
          crewValue: Math.abs(deltaPp),
          leagueValue: baselinePct,
          crewLabel: "Ref×team win rate",
          leagueLabel: "Team baseline",
          format: "pct",
          deltaPp,
          refWinRate: recordWinRate,
          teamBaseline: baselinePct,
        };
      }
    }
  }

  const perGameStat = card.stats.find((stat) => /per game|\/g|avg/i.test(stat.label));
  const crewPerGame = perGameStat ? parseNumericToken(perGameStat.value) : null;
  const heroDelta = parseNumericToken(card.heroValue);
  const heroLabel = card.heroLabel.toLowerCase();

  if (
    crewPerGame !== null &&
    heroDelta !== null &&
    (heroLabel.includes("vs league") || heroLabel.includes("variance"))
  ) {
    const leaguePerGame = crewPerGame / (1 + heroDelta / 100);
    if (Number.isFinite(leaguePerGame) && leaguePerGame > 0) {
      return {
        crewValue: crewPerGame,
        leagueValue: leaguePerGame,
        crewLabel: metricLabelFromHero(card) || "Crew metric",
        leagueLabel: "League average",
        format: "decimal",
      };
    }
  }

  const vsLeagueStat = card.stats.find((stat) =>
    /vs league|delta|variance/i.test(stat.label),
  );
  if (crewPerGame !== null && vsLeagueStat) {
    const delta = parseNumericToken(vsLeagueStat.value);
    if (delta !== null) {
      const leaguePerGame = crewPerGame - delta;
      if (Number.isFinite(leaguePerGame) && leaguePerGame > 0) {
        return {
          crewValue: crewPerGame,
          leagueValue: leaguePerGame,
          crewLabel: perGameStat?.label ?? "Crew metric",
          leagueLabel: "League average",
          format: "decimal",
        };
      }
    }
  }

  return null;
}

/** Sample games from card for data maturity bar (percent derived in DataMaturityBar). */
export function insightDataMaturityScore(card: LeagueInsightCard): number {
  return parseGamesFromCard(card);
}

/** @deprecated Use insightDataMaturityScore */
export function insightConfidenceScore(card: LeagueInsightCard): number {
  return insightDataMaturityScore(card);
}
