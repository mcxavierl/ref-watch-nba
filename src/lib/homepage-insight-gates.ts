import {
  ATS_OU_CLOSING_LINE_MIN_GAMES,
  CREW_ANOMALY_MIN_GAMES,
  METHODOLOGY_SAMPLE_GATES,
  REF_TEAM_SPLIT_MIN_GAMES,
  type MethodologyInsightCategory,
} from "@/config/methodology";
import { RELIABILITY_FLOOR_GAMES } from "@/lib/data-maturity";
import { parseGamesFromCard } from "@/lib/insight-editorial";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { WIN_RATE_OUTLIER_PP } from "@/lib/metric-significance";

const CREW_ANOMALY_PATTERN =
  /crew anomaly|team[- ]crew|crew pairing|when .+ work .+ games/i;
const ATS_OU_PATTERN =
  /\bats\b|against the spread|cover rate|closing line|o\/u|over\/under|over benchmark/i;

function parseDeltaPpFromCard(card: LeagueInsightCard): number | null {
  const match = card.heroValue.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Classify an insight card against published methodology gates. */
export function homepageInsightCategory(
  card: LeagueInsightCard,
): MethodologyInsightCategory {
  const haystack = `${card.kicker} ${card.headline} ${card.story}`.toLowerCase();

  if (CREW_ANOMALY_PATTERN.test(haystack) || card.kicker.toLowerCase().includes("crew")) {
    return "crew-anomaly";
  }

  if (ATS_OU_PATTERN.test(haystack)) {
    return "ats-ou";
  }

  return "ref-team-split";
}

export function minSampleGateForCategory(
  category: MethodologyInsightCategory,
): number {
  return METHODOLOGY_SAMPLE_GATES[category];
}

export function minSampleGateForCard(card: LeagueInsightCard): number {
  const category = homepageInsightCategory(card);
  let gate = minSampleGateForCategory(category);

  // Homepage ref×team cards require the reliability floor (15+), not just the matrix floor (8+).
  if (card.kind === "matrix-edge" && category === "ref-team-split") {
    gate = Math.max(gate, RELIABILITY_FLOOR_GAMES);
  }

  return gate;
}

/** True when the card clears its published methodology sample gate. */
export function passesHomepageSampleGate(card: LeagueInsightCard): boolean {
  const sampleGames = parseGamesFromCard(card);
  if (sampleGames <= 0) return false;

  const gate = minSampleGateForCard(card);
  if (sampleGames < gate) return false;

  if (card.kind === "matrix-edge" && sampleGames < REF_TEAM_SPLIT_MIN_GAMES) {
    return false;
  }

  return true;
}

/** Homepage surfaces only gate-qualified insight cards. */
export function filterHomepageInsightCards(
  cards: LeagueInsightCard[],
): LeagueInsightCard[] {
  return cards.filter(passesHomepageSampleGate);
}

/** Statistically significant label is reserved for gate-qualified splits with material deltas. */
export function isStatisticallySignificantInsight(card: LeagueInsightCard): boolean {
  if (!passesHomepageSampleGate(card)) return false;

  if (card.kind === "matrix-edge") {
    const delta = parseDeltaPpFromCard(card);
    return delta !== null && Math.abs(delta) >= WIN_RATE_OUTLIER_PP;
  }

  if (card.kind === "ref-outlier") {
    const sampleGames = parseGamesFromCard(card);
    return sampleGames >= ATS_OU_CLOSING_LINE_MIN_GAMES;
  }

  const category = homepageInsightCategory(card);
  if (category === "crew-anomaly") {
    return parseGamesFromCard(card) >= CREW_ANOMALY_MIN_GAMES;
  }

  if (category === "ats-ou") {
    return parseGamesFromCard(card) >= ATS_OU_CLOSING_LINE_MIN_GAMES;
  }

  return false;
}

export function homepageInsightKicker(card: LeagueInsightCard): string {
  if (isStatisticallySignificantInsight(card)) {
    return "Statistically significant ref×team split";
  }

  const sampleGames = parseGamesFromCard(card);
  if (card.kind === "matrix-edge") {
    return sampleGames > 0
      ? `Ref×team split · N=${sampleGames}`
      : "Ref×team split";
  }

  return card.kicker;
}
