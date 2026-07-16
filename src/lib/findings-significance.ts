import type { Finding, FindingCategory, ScoredFindingBase } from "@/lib/findings-shared";
import {
  CONFIDENCE_TIER_RANK,
  findingConfidenceTier,
} from "@/lib/findings-shared";
import type { ConfidenceTier } from "@/lib/user-language";

const CONFIDENCE_PICK_ORDER: ConfidenceTier[] = ["Strong", "Moderate", "Thin"];

/** Min games-weighted over rate distance from 50% to promote a league skew finding. */
export const LEAGUE_WEIGHTED_OVER_MIN_SKEW = 0.04;

/** Min foul-per-game swing for cross-team whistle findings. */
export const CROSS_TEAM_WHISTLE_MIN_SPREAD = 4;

/** Min games on each side of a cross-team whistle split. */
export const CROSS_TEAM_WHISTLE_MIN_SIDE_GAMES = 10;

/** Min O/U or ATS edge (percentage points from 50%) for betting findings. */
export const BETTING_EDGE_MIN_PTS = 0.05;

/** Min matrix win-rate delta (percentage points) to treat as a headline split. */
export const MATRIX_HEADLINE_MIN_DELTA_PTS = 20;

export function weightedLeagueOverRate(
  refs: { overRate: number; games: number }[],
): number {
  const games = refs.reduce((sum, r) => sum + r.games, 0);
  if (games === 0) return 0.5;
  return refs.reduce((sum, r) => sum + r.overRate * r.games, 0) / games;
}

export function isLeagueBenchmarkSkewSignificant(weightedOver: number): boolean {
  return Math.abs(weightedOver - 0.5) >= LEAGUE_WEIGHTED_OVER_MIN_SKEW;
}

export function leagueBenchmarkLean(
  weightedOver: number,
): "over" | "under" | "neutral" {
  if (weightedOver >= 0.5 + LEAGUE_WEIGHTED_OVER_MIN_SKEW) return "over";
  if (weightedOver <= 0.5 - LEAGUE_WEIGHTED_OVER_MIN_SKEW) return "under";
  return "neutral";
}

export function isNflFlagsOutlier(
  avgFlags: number,
  leagueAvg: number,
  games: number,
  minGames = 30,
): boolean {
  if (games < minGames) return false;
  return Math.abs(avgFlags - leagueAvg) >= 1.2 || avgFlags >= leagueAvg + 1.5;
}

export function isPromotableFinding(finding: ScoredFindingBase): boolean {
  if (
    finding.id.startsWith("matrix-") ||
    finding.id.startsWith("nhl-matrix-")
  ) {
    const deltaStat = finding.stats.find((s) =>
      s.label.toLowerCase().includes("delta"),
    );
    if (deltaStat) {
      const n = parseFloat(deltaStat.value.replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(n) && Math.abs(n) < MATRIX_HEADLINE_MIN_DELTA_PTS) {
        return false;
      }
    }
  }

  if (finding.id === "cross-team-whistle") {
    const swing = finding.stats.find((s) => s.label === "Whistle swing");
    const n = swing ? parseFloat(swing.value) : 0;
    if (n < CROSS_TEAM_WHISTLE_MIN_SPREAD) return false;
    const sideGames = finding.stats
      .filter((s) => s.label.toLowerCase().includes("foul edge"))
      .map((s) => {
        const match = s.detail?.match(/(\d+)\s+games/);
        return match ? parseInt(match[1], 10) : 0;
      });
    if (sideGames.some((g) => g < CROSS_TEAM_WHISTLE_MIN_SIDE_GAMES)) {
      return false;
    }
  }

  if (finding.category === "ou-edge" || finding.category === "ats-edge") {
    const edgeStat = finding.stats.find((s) =>
      s.label.toLowerCase().includes("edge"),
    );
    if (edgeStat) {
      const n = parseFloat(edgeStat.value.replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(n) && n / 100 < BETTING_EDGE_MIN_PTS) return false;
    }
  }

  return true;
}

/** Strong-confidence findings first, then score within each tier. */
export function rankScoredFindings(
  ranked: ScoredFindingBase[],
): ScoredFindingBase[] {
  return [...ranked].sort((a, b) => {
    const tierA =
      CONFIDENCE_TIER_RANK[findingConfidenceTier(a, a.sampleGames)];
    const tierB =
      CONFIDENCE_TIER_RANK[findingConfidenceTier(b, b.sampleGames)];
    if (tierA !== tierB) return tierA - tierB;
    return b.score - a.score;
  });
}

function canPickCategory(
  category: FindingCategory,
  pickedCount: number,
  categoryCounts: Map<FindingCategory, number>,
): boolean {
  const count = categoryCounts.get(category) ?? 0;
  if (pickedCount < 3 && count >= 1) return false;
  if (count >= 2) return false;
  return true;
}

/** Prefer diverse categories in the hero without skipping much stronger findings. */
export function pickFeaturedFindings(
  ranked: ScoredFindingBase[],
  limit: number,
): Finding[] {
  const eligible = rankScoredFindings(ranked.filter(isPromotableFinding));
  const picked: Finding[] = [];
  const categoryCounts = new Map<FindingCategory, number>();

  for (const tier of CONFIDENCE_PICK_ORDER) {
    for (const item of eligible) {
      if (findingConfidenceTier(item, item.sampleGames) !== tier) continue;
      if (!canPickCategory(item.category, picked.length, categoryCounts)) continue;

      categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
      const { score, sampleGames, ...finding } = item;
      picked.push(finding);
      if (picked.length >= limit) return picked;
    }
  }

  if (picked.length < limit) {
    const pickedIds = new Set(picked.map((finding) => finding.id));
    for (const item of eligible) {
      if (pickedIds.has(item.id)) continue;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
      const { score, sampleGames, ...finding } = item;
      picked.push(finding);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}
