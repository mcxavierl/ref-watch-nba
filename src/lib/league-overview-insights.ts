import { computeFindings as computeNbaFindings } from "@/lib/findings";
import { computeFindings as computeEplFindings } from "@/lib/epl/findings";
import { getTeamSplits as getEplTeamSplits } from "@/lib/epl/data";
import { EPL_TEAMS, teamFullName as eplTeamFullName } from "@/lib/epl/teams";
import { computeFindings as computeLaligaFindings } from "@/lib/laliga/findings";
import { getTeamSplits as getLaligaTeamSplits } from "@/lib/laliga/data";
import { LALIGA_TEAMS, teamFullName as laligaTeamFullName } from "@/lib/laliga/teams";
import { computeFindings as computeNflFindings } from "@/lib/nfl/findings";
import { getTeamSplits as getNflTeamSplits } from "@/lib/nfl/data";
import { NFL_TEAMS, teamFullName as nflTeamFullName } from "@/lib/nfl/teams";
import { computeFindings as computeNhlFindings } from "@/lib/nhl/findings";
import { getTeamSplits as getNhlTeamSplits } from "@/lib/nhl/data";
import { NHL_TEAMS, teamFullName as nhlTeamFullName } from "@/lib/nhl/teams";
import type { Finding } from "@/lib/findings-shared";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import {
  computeMatrixExtremes,
  computeRefTeamMatrix,
  formatMatrixHighlightBaseline,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import {
  insightDrilldownId,
} from "@/lib/insight-drilldown-types";
import { formatBaselinePct, formatPct } from "@/lib/stats-utils";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";
import { getTeamSplits as getNbaTeamSplits } from "@/lib/data";
import { NBA_TEAMS, teamFullName as nbaTeamFullName } from "@/lib/teams";

export type LeagueInsightTone = "positive" | "negative" | "neutral";

export type LeagueInsightCard = {
  leagueId: LeagueId;
  label: string;
  shortLabel: string;
  kind: "matrix-edge" | "ref-outlier" | "league-pattern";
  kicker: string;
  headline: string;
  story: string;
  heroValue: string;
  heroLabel: string;
  heroTone: LeagueInsightTone;
  stats: { label: string; value: string }[];
  links: { label: string; href: string }[];
  entityName?: string;
  entityHref?: string;
  teamLabel?: string;
  /** Matrix-edge drill-down lookup (client fetches static JSON shard). */
  refSlug?: string;
  teamAbbr?: string;
  drilldownId?: string;
};

type LeagueInsightConfig = {
  leagueId: LeagueId;
  teams: { abbr: string; label: string; name: string; nbaId?: number }[];
  getTeamSplits: (abbr: string) => import("@/lib/types").TeamCrewSplit[];
  computeFindings: (limit?: number) => Finding[];
  matrixLeague: "nba" | "nhl" | "nfl" | "epl" | "laliga";
};

const LEAGUE_CONFIG: Record<(typeof VERIFIED_LIVE_LEAGUE_IDS)[number], LeagueInsightConfig> = {
  nba: {
    leagueId: "nba",
    teams: NBA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: nbaTeamFullName(team),
      name: team.name,
      nbaId: team.nbaId,
    })),
    getTeamSplits: getNbaTeamSplits,
    computeFindings: computeNbaFindings,
    matrixLeague: "nba",
  },
  nhl: {
    leagueId: "nhl",
    teams: NHL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: nhlTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getNhlTeamSplits,
    computeFindings: computeNhlFindings,
    matrixLeague: "nhl",
  },
  nfl: {
    leagueId: "nfl",
    teams: NFL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: nflTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getNflTeamSplits,
    computeFindings: computeNflFindings,
    matrixLeague: "nfl",
  },
  epl: {
    leagueId: "epl",
    teams: EPL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: eplTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getEplTeamSplits,
    computeFindings: computeEplFindings,
    matrixLeague: "epl",
  },
  laliga: {
    leagueId: "laliga",
    teams: LALIGA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: laligaTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getLaligaTeamSplits,
    computeFindings: computeLaligaFindings,
    matrixLeague: "laliga",
  },
};

function leaguePrefix(leagueId: LeagueId): string {
  return LEAGUES[leagueId].pathPrefix;
}

function refHref(leagueId: LeagueId, slug: string): string {
  return `${leaguePrefix(leagueId)}/refs/${slug}`;
}

function matrixHref(leagueId: LeagueId): string {
  return `${leaguePrefix(leagueId)}/matrix`;
}

type VerifiedLiveLeagueId = (typeof VERIFIED_LIVE_LEAGUE_IDS)[number];

function insightsHref(leagueId: VerifiedLiveLeagueId): string {
  return insightsViewHref(leagueId, "findings");
}

function trendsHref(leagueId: VerifiedLiveLeagueId): string {
  return insightsViewHref(leagueId, "trends");
}

function formatDeltaPts(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp`;
}

function heroToneFromDelta(delta: number): LeagueInsightTone {
  if (delta >= 12) return "positive";
  if (delta <= -12) return "negative";
  return "neutral";
}

function cardFromMatrix(
  leagueId: VerifiedLiveLeagueId,
  highlight: MatrixExtremeHighlight,
): LeagueInsightCard {
  const config = LEAGUES[leagueId];
  const prefix = leaguePrefix(leagueId);
  const splitPct = formatPct(highlight.winRate);
  const baselinePct = formatBaselinePct(
    highlight.baselineGames,
    highlight.baselineWinRate,
  );
  const deltaLabel = formatDeltaPts(highlight.deltaPts);
  const direction =
    highlight.deltaPts > 0 ? "beats" : highlight.deltaPts < 0 ? "trails" : "matches";

  return {
    leagueId,
    label: config.label,
    shortLabel: config.shortLabel,
    kind: "matrix-edge",
    kicker: "Standout ref×team split",
    headline: `${highlight.refName} ${direction} ${highlight.teamLabel} baseline`,
    story: `${highlight.wins}-${highlight.losses} (${splitPct}) across ${highlight.games} games. Team sample without this ref: ${baselinePct} (${formatMatrixHighlightBaseline(highlight)}).`,
    heroValue: deltaLabel,
    heroLabel: "Win rate vs team baseline",
    heroTone: heroToneFromDelta(highlight.deltaPts),
    stats: [
      { label: "Ref×team record", value: `${highlight.wins}-${highlight.losses}` },
      { label: "Games", value: String(highlight.games) },
      { label: "Team baseline", value: baselinePct },
    ],
    links: [
      { label: "Open matrix", href: matrixHref(leagueId) },
      { label: "Ref profile", href: refHref(leagueId, highlight.refSlug) },
      { label: "League trends", href: trendsHref(leagueId) },
    ],
    entityName: highlight.refName,
    entityHref: refHref(leagueId, highlight.refSlug),
    teamLabel: highlight.teamLabel,
    refSlug: highlight.refSlug,
    teamAbbr: highlight.teamAbbr,
    drilldownId: insightDrilldownId(
      leagueId,
      highlight.refSlug,
      highlight.teamAbbr,
    ),
  };
}

function cardFromFinding(leagueId: VerifiedLiveLeagueId, finding: Finding): LeagueInsightCard {
  const config = LEAGUES[leagueId];
  const primary = finding.stats[0];
  const secondary = finding.stats[1];
  const refLink = finding.links.find((link) => link.href.includes("/refs/"));

  return {
    leagueId,
    label: config.label,
    shortLabel: config.shortLabel,
    kind:
      finding.category === "ref-outlier" || finding.category === "whistle-extreme"
        ? "ref-outlier"
        : "league-pattern",
    kicker:
      finding.category === "ref-team-split"
        ? "Ref×team pattern"
        : finding.category === "whistle-extreme" || finding.category === "ref-outlier"
          ? "Whistle outlier"
          : "League pattern",
    headline: finding.headline,
    story: finding.summary,
    heroValue: primary?.value ?? EMPTY_DISPLAY,
    heroLabel: primary?.label ?? "Lead stat",
    heroTone: "neutral",
    stats: [primary, secondary]
      .filter((stat): stat is { label: string; value: string } => Boolean(stat))
      .map((stat) => ({ label: stat.label, value: stat.value })),
    links: [
      { label: "Full finding", href: insightsHref(leagueId) },
      ...(refLink ? [{ label: refLink.label, href: refLink.href }] : []),
      { label: `${config.shortLabel} hub`, href: prefixOrRoot(leagueId) },
    ],
    entityName: refLink?.label,
    entityHref: refLink?.href,
  };
}

function prefixOrRoot(leagueId: LeagueId): string {
  return leaguePrefix(leagueId) || "/";
}

function pickInsight(
  leagueId: VerifiedLiveLeagueId,
  matrix: MatrixExtremeHighlight | undefined,
  finding: Finding | undefined,
): LeagueInsightCard | null {
  if (matrix && Math.abs(matrix.deltaPts) >= 30) {
    return cardFromMatrix(leagueId, matrix);
  }
  if (finding) {
    return cardFromFinding(leagueId, finding);
  }
  if (matrix) {
    return cardFromMatrix(leagueId, matrix);
  }
  return null;
}

export function buildLeagueInsightCards(): LeagueInsightCard[] {
  const cards: LeagueInsightCard[] = [];

  for (const leagueId of VERIFIED_LIVE_LEAGUE_IDS) {
    const setup = LEAGUE_CONFIG[leagueId];
    const { stats } = loadLeagueStats(leagueId);
    if (stats.refs.length === 0) continue;

    const matrix = computeRefTeamMatrix(
      stats,
      setup.teams,
      setup.getTeamSplits,
      8,
      { league: setup.matrixLeague },
    );
    const extreme = computeMatrixExtremes(matrix, 1)[0];
    const finding = setup.computeFindings(1)[0];
    const card = pickInsight(leagueId, extreme, finding);
    if (card) cards.push(card);
  }

  return cards;
}
