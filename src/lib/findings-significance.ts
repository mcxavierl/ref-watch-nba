import type { Finding, FindingCategory, ScoredFindingBase } from "@/lib/findings-shared";

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

/** Prefer diverse categories in the hero without skipping much stronger findings. */
export function pickFeaturedFindings(
  ranked: ScoredFindingBase[],
  limit: number,
): Finding[] {
  const eligible = ranked.filter(isPromotableFinding);
  const picked: Finding[] = [];
  const categoryCounts = new Map<FindingCategory, number>();

  for (const item of eligible) {
    const count = categoryCounts.get(item.category) ?? 0;
    if (picked.length < 3 && count >= 1) continue;
    if (count >= 2) continue;

    categoryCounts.set(item.category, count + 1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
    const { score, sampleGames, ...finding } = item;
    picked.push(finding);
    if (picked.length >= limit) break;
  }

  return picked;
}
