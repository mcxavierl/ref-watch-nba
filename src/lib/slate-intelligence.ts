import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { resolveGameTimestampMs } from "@/lib/overview-slate-shared";
import { torontoIsoDate } from "@/lib/slate-game-phase";
import { formatSlateDateTimeLabel } from "@/lib/slate-team-display";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  isWnbaAllStarMatchup,
  wnbaAllStarEventLabel,
} from "@/lib/wnba/teams";

export const SLATE_MODEL_VERSION = "3.8";

export type WhistlePersonality = "high" | "defensive" | "neutral";

export type SlateDeltaTooltip = {
  crewBaseline: number;
  historicalMatchup: number;
  teamSplitPressure: number;
};

export type SignalTier = "high" | "elevated" | "standard" | "pending";

export type SlateGameIntelligence = {
  personality: WhistlePersonality;
  verdictHeadline: string;
  expectedWhistles: number;
  leagueAvgWhistles: number;
  whistleDelta: number;
  whistleDeltaLabel: string;
  confidencePct: number;
  evidenceScore: number;
  signalTier: SignalTier;
  signalTierLabel: string;
  statusLabel: string;
  statusKind: "live" | "pregame" | "final";
  deltaTooltip: SlateDeltaTooltip;
  sampleGames: number;
  modelVersion: string;
  intelligenceHref: string;
  signalScore: number;
  crewChiefName?: string;
  crewCount: number;
};

export type SlateOutlookSummary = {
  liveAndAssignedMonitored: number;
  pendingCrewCount: number;
  highWhistleCount: number;
  defensiveCrewCount: number;
  avgConfidencePct: number | null;
  topSignal: {
    matchup: string;
    whistleDelta: number;
    whistleDeltaLabel: string;
    confidencePct: number;
    signalTierLabel: string;
  } | null;
};

export type HomepageSlatePartition = {
  primaryGames: OverviewSlateEntry[];
  pendingGames: OverviewSlateEntry[];
};

export type SlateHistoricalMatchupBaseline = {
  title: string;
  lines: string[];
  isEmptyFallback?: boolean;
};

export const PENDING_EMPTY_H2H_COPY = "No recent head-to-head matchups on file";

const NO_RECENT_LOG_RE = /no recent .+ log on file/i;

function stripNoRecentLogClauses(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (/^Recent form:/i.test(trimmed)) {
    const body = trimmed.replace(/^Recent form:\s*/i, "");
    const parts = body
      .split(" · ")
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && !NO_RECENT_LOG_RE.test(part));
    if (parts.length === 0) return null;
    return `Recent form: ${parts.join(" · ")}`;
  }

  if (NO_RECENT_LOG_RE.test(trimmed)) return null;
  return trimmed;
}

export function sanitizePendingMatchupLines(lines: string[]): SlateHistoricalMatchupBaseline {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const sanitized = stripNoRecentLogClauses(raw);
    if (!sanitized || seen.has(sanitized)) continue;
    seen.add(sanitized);
    deduped.push(sanitized);
  }

  if (deduped.length === 0) {
    return {
      title: "HISTORICAL TEAM MATCHUP",
      lines: [PENDING_EMPTY_H2H_COPY],
      isEmptyFallback: true,
    };
  }

  return {
    title: "HISTORICAL TEAM MATCHUP",
    lines: deduped,
    isEmptyFallback: false,
  };
}

function resolveMatchupBaselineTitle(game: OverviewSlateEntry): string {
  if (game.leagueId === "wnba" && isWnbaAllStarMatchup(game.awayTeam, game.homeTeam)) {
    return wnbaAllStarEventLabel();
  }
  return "HISTORICAL TEAM MATCHUP";
}

function buildAllStarMatchupBaseline(
  game: OverviewSlateEntry,
): SlateHistoricalMatchupBaseline {
  const preview = game.preview;
  const briefingLines = preview?.matchupBriefing?.lines ?? [];
  const lines =
    briefingLines.length > 0
      ? briefingLines
      : [
          `${wnbaAllStarEventLabel()} · ${game.awayTeam} vs ${game.homeTeam} exhibition rosters.`,
          "All-Star showcase event - franchise head-to-head history does not apply.",
        ];

  return {
    title: wnbaAllStarEventLabel(),
    lines,
    isEmptyFallback: false,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function compactMatchupLabel(game: OverviewSlateEntry): string {
  return `${game.awayTeam} @ ${game.homeTeam}`;
}

export function whistlePersonality(foulsDelta: number): WhistlePersonality {
  if (foulsDelta >= 1.5) return "high";
  if (foulsDelta <= -1.5) return "defensive";
  return "neutral";
}

export function signalTierFromConfidence(
  confidencePct: number,
  whistleDelta: number,
): { tier: SignalTier; label: string } {
  const absDelta = Math.abs(whistleDelta);
  if (confidencePct >= 80 || (confidencePct >= 68 && absDelta >= 1.5)) {
    return { tier: "high", label: "[HIGH SIGNAL]" };
  }
  if (confidencePct >= 55 && absDelta >= 1.0) {
    return { tier: "elevated", label: "[ELEVATED]" };
  }
  return { tier: "standard", label: "[STANDARD]" };
}

export function pendingCrewSignalTier(): { tier: SignalTier; label: string } {
  return { tier: "pending", label: "[CREW PENDING]" };
}

export function isSlateGameLive(game: OverviewSlateEntry): boolean {
  return game.status === "live" || game.gamePhase === "live";
}

export function isSlateGameFinal(game: OverviewSlateEntry): boolean {
  return game.status === "final" || game.gamePhase === "final";
}

/** True when a published crew is attached to the slate card. */
export function hasRefAssignments(game: OverviewSlateEntry): boolean {
  const preview = game.preview;
  if (
    preview?.awaitingCrew &&
    (preview.crew?.length ?? 0) === 0 &&
    game.crewCount === 0
  ) {
    return false;
  }
  if ((preview?.crew?.length ?? 0) > 0) return true;
  if (game.crewCount > 0 && Boolean(game.headRef)) return true;
  return Boolean(game.headRef) && !preview?.awaitingCrew;
}

function isTodaySlateGame(game: OverviewSlateEntry, now: Date): boolean {
  if (!game.slateDate) return true;
  return game.slateDate === torontoIsoDate(now);
}

function normalizeLiveStatusDetail(clock: string | undefined, period: string | undefined): string {
  const trimmedClock = clock?.trim();
  const trimmedPeriod = period?.trim();

  if (trimmedClock) {
    const lowerClock = trimmedClock.toLowerCase();
    if (lowerClock === "halftime" || lowerClock === "half") {
      return "Half";
    }
    if (trimmedPeriod && trimmedClock.startsWith(trimmedPeriod)) {
      return trimmedClock;
    }
    if (trimmedPeriod && !trimmedClock.includes(trimmedPeriod)) {
      return `${trimmedPeriod} ${trimmedClock}`;
    }
    return trimmedClock;
  }

  return trimmedPeriod ?? "";
}

export function formatSlateGameStatusLabel(game: OverviewSlateEntry): string {
  if (isSlateGameLive(game)) {
    const detail = normalizeLiveStatusDetail(game.gameClock, game.gamePeriod);
    return detail ? `LIVE · ${detail}` : "LIVE";
  }

  if (isSlateGameFinal(game)) {
    return "FINAL";
  }

  const dateTimeLabel = formatSlateDateTimeLabel(game.slateDate, game.slateStartAt);
  return dateTimeLabel ?? "SCHEDULED";
}

function resolveSignalTier(
  game: OverviewSlateEntry,
  confidencePct: number,
  whistleDelta: number,
): { tier: SignalTier; label: string } {
  if (!hasRefAssignments(game)) {
    return pendingCrewSignalTier();
  }
  return signalTierFromConfidence(confidencePct, whistleDelta);
}

export function buildHistoricalMatchupBaseline(
  game: OverviewSlateEntry,
): SlateHistoricalMatchupBaseline {
  if (game.leagueId === "wnba" && isWnbaAllStarMatchup(game.awayTeam, game.homeTeam)) {
    return buildAllStarMatchupBaseline(game);
  }

  const title = resolveMatchupBaselineTitle(game);
  const preview = game.preview;
  const briefing = preview?.matchupBriefing;
  const h2hGames = Math.max(briefing?.h2hGames ?? 0, preview?.sampleGames ?? 0);
  const scoringLabel = preview?.scoringLabel?.toLowerCase() ?? "points";
  const whistleLabel = preview?.whistleLabel?.toLowerCase() ?? "fouls";

  if (briefing && h2hGames > 0) {
    const window = Math.min(h2hGames, 5);
    const avgTotalPoints = briefing.avgTotalPoints || preview?.avgTotalPoints || 0;
    const avgFouls = briefing.avgFouls || preview?.avgFouls || 0;
    const overRate = briefing.overRate ?? preview?.overRate ?? 0.5;
    const lines = [
      `Last ${window} meeting${window === 1 ? "" : "s"}: ${avgTotalPoints} avg ${scoringLabel} · ${avgFouls} avg ${whistleLabel}`,
      `Head-to-head record: ${game.awayTeam} vs ${game.homeTeam} · ${formatPct(overRate)} over`,
    ];
    if (briefing.lastMeeting) {
      lines.push(briefing.lastMeeting);
    }

    return {
      title,
      lines,
      isEmptyFallback: false,
    };
  }

  if (briefing?.lines?.length) {
    const fromBriefing = sanitizePendingMatchupLines(briefing.lines);
    if (!fromBriefing.isEmptyFallback) {
      return {
        ...fromBriefing,
        title,
      };
    }
  }

  const lines: string[] = [];
  for (const candidate of [
    game.matchupInsight,
    game.lastMeetingLine,
    game.gameContextLine,
    game.teamContextLine,
    ...(briefing?.lines ?? []),
  ]) {
    if (candidate?.trim()) {
      lines.push(candidate.trim());
    }
  }

  const sanitized = sanitizePendingMatchupLines(lines);
  return {
    ...sanitized,
    title,
  };
}

function pendingCrewIntelligence(game: OverviewSlateEntry): SlateGameIntelligence {
  const status = statusForGame(game);
  const signalTier = pendingCrewSignalTier();
  const baseline = buildHistoricalMatchupBaseline(game);

  return {
    personality: "neutral",
    verdictHeadline:
      baseline.title === wnbaAllStarEventLabel()
        ? wnbaAllStarEventLabel()
        : "Historical team matchup",
    expectedWhistles: 0,
    leagueAvgWhistles: 0,
    whistleDelta: 0,
    whistleDeltaLabel: formatSigned(0),
    confidencePct: 0,
    evidenceScore: 0,
    signalTier: signalTier.tier,
    signalTierLabel: signalTier.label,
    statusLabel: status.label,
    statusKind: status.kind,
    deltaTooltip: {
      crewBaseline: 0,
      historicalMatchup: 0,
      teamSplitPressure: 0,
    },
    sampleGames: 0,
    modelVersion: SLATE_MODEL_VERSION,
    intelligenceHref: `${game.href}#game-${game.gameId}`,
    signalScore: 0,
    crewCount: game.crewCount,
  };
}

/** @deprecated Prefer signalTierFromConfidence for slate surfaces. */
export function starRatingFromConfidence(confidencePct: number): {
  rating: number;
  display: string;
} {
  const rating = Math.min(5, Math.max(1, Math.ceil(confidencePct / 17)));
  return {
    rating,
    display: `Signal ${rating}/5`,
  };
}

function buildDeltaTooltip(
  foulsDelta: number,
  preview: GameSlatePreviewPayload,
): SlateDeltaTooltip {
  const evidence = buildProjectionEvidence(preview);
  const contributions = evidence.modelContribution;
  const crewPct = contributions.find((row) => row.factor === "Crew")?.percentage ?? 0;
  const teamPct = contributions.find((row) => row.factor === "Teams")?.percentage ?? 0;
  const historicalPct =
    contributions.find((row) => row.factor === "Historical Matchups")?.percentage ?? 0;
  const weightTotal = crewPct + teamPct + historicalPct || 100;

  return {
    crewBaseline: round1(foulsDelta * (crewPct / weightTotal)),
    historicalMatchup: round1(foulsDelta * (historicalPct / weightTotal)),
    teamSplitPressure: round1(foulsDelta * (teamPct / weightTotal)),
  };
}

function statusForGame(game: OverviewSlateEntry): {
  label: string;
  kind: "live" | "pregame" | "final";
} {
  if (isSlateGameLive(game)) {
    return { kind: "live", label: formatSlateGameStatusLabel(game) };
  }

  if (isSlateGameFinal(game)) {
    return { kind: "final", label: formatSlateGameStatusLabel(game) };
  }

  return { kind: "pregame", label: formatSlateGameStatusLabel(game) };
}

function verdictHeadline(personality: WhistlePersonality): string {
  if (personality === "high") return "High whistle environment";
  if (personality === "defensive") return "Defensive / low whistle";
  return "Baseline whistle profile";
}

function resolveCrewChiefName(game: OverviewSlateEntry): string | undefined {
  const crew = game.preview?.crew ?? [];
  if (crew.length === 0) return game.headRef;
  const chief =
    crew.find((official) => official.role === "crew_chief") ??
    crew.find((official) => official.role === "referee") ??
    crew[0];
  return chief?.name ?? game.headRef;
}

function previewHasActionableMetrics(preview: GameSlatePreviewPayload): boolean {
  if (preview.awaitingCrew && preview.crew.length === 0) {
    return preview.sampleGames > 0 || Math.abs(preview.foulsDelta) >= 0.05;
  }
  return (
    preview.sampleGames > 0 ||
    preview.avgFouls > 0 ||
    Math.abs(preview.foulsDelta) >= 0.05 ||
    preview.crew.length > 0
  );
}

function fallbackIntelligence(game: OverviewSlateEntry): SlateGameIntelligence {
  const status = statusForGame(game);
  const signalTier = resolveSignalTier(game, 0, 0);
  return {
    personality: "neutral",
    verdictHeadline: verdictHeadline("neutral"),
    expectedWhistles: 0,
    leagueAvgWhistles: 0,
    whistleDelta: 0,
    whistleDeltaLabel: formatSigned(0),
    confidencePct: 0,
    evidenceScore: 0,
    signalTier: signalTier.tier,
    signalTierLabel: signalTier.label,
    statusLabel: status.label,
    statusKind: status.kind,
    deltaTooltip: {
      crewBaseline: 0,
      historicalMatchup: 0,
      teamSplitPressure: 0,
    },
    sampleGames: 0,
    modelVersion: SLATE_MODEL_VERSION,
    intelligenceHref: `${game.href}#game-${game.gameId}`,
    signalScore: 0,
    crewChiefName: resolveCrewChiefName(game),
    crewCount: game.crewCount,
  };
}

export function buildSlateGameIntelligence(
  game: OverviewSlateEntry,
): SlateGameIntelligence {
  if (!hasRefAssignments(game)) {
    return pendingCrewIntelligence(game);
  }

  const preview = game.preview;
  if (!preview || !previewHasActionableMetrics(preview)) {
    return fallbackIntelligence(game);
  }

  const evidence = buildProjectionEvidence(preview);
  const leagueAvg = round1(preview.avgFouls - preview.foulsDelta);
  const personality = whistlePersonality(preview.foulsDelta);
  const signalTier = resolveSignalTier(game, evidence.confidencePct, preview.foulsDelta);
  const status = statusForGame(game);
  const signalScore = Math.abs(preview.foulsDelta) * evidence.confidencePct;

  return {
    personality,
    verdictHeadline: verdictHeadline(personality),
    expectedWhistles: evidence.projection,
    leagueAvgWhistles: leagueAvg,
    whistleDelta: preview.foulsDelta,
    whistleDeltaLabel: formatSigned(preview.foulsDelta),
    confidencePct: evidence.confidencePct,
    evidenceScore: evidence.evidenceStrength,
    signalTier: signalTier.tier,
    signalTierLabel: signalTier.label,
    statusLabel: status.label,
    statusKind: status.kind,
    deltaTooltip: buildDeltaTooltip(preview.foulsDelta, preview),
    sampleGames: preview.sampleGames,
    modelVersion: SLATE_MODEL_VERSION,
    intelligenceHref: `${game.href}#game-${game.gameId}`,
    signalScore,
    crewChiefName: resolveCrewChiefName(game),
    crewCount: game.crewCount,
  };
}

export function buildSlateOutlookSummary(
  games: OverviewSlateEntry[],
): SlateOutlookSummary {
  if (games.length === 0) {
    return {
      liveAndAssignedMonitored: 0,
      pendingCrewCount: 0,
      highWhistleCount: 0,
      defensiveCrewCount: 0,
      avgConfidencePct: null,
      topSignal: null,
    };
  }

  const intelRows = games.map((game) => ({
    game,
    intel: buildSlateGameIntelligence(game),
  }));

  const assignedRows = intelRows.filter((row) => hasRefAssignments(row.game));
  const confidenceValues = assignedRows
    .map((row) => row.intel.confidencePct)
    .filter((value) => value > 0);
  const avgConfidencePct =
    confidenceValues.length > 0
      ? Math.round(
          confidenceValues.reduce((sum, value) => sum + value, 0) /
            confidenceValues.length,
        )
      : null;

  const ranked = [...assignedRows]
    .filter((row) => row.intel.signalTier !== "pending")
    .sort((left, right) => right.intel.signalScore - left.intel.signalScore);
  const top = ranked[0];

  return {
    liveAndAssignedMonitored: intelRows.filter(
      (row) => isSlateGameLive(row.game) || hasRefAssignments(row.game),
    ).length,
    pendingCrewCount: intelRows.filter(
      (row) => !hasRefAssignments(row.game) && !isSlateGameFinal(row.game),
    ).length,
    highWhistleCount: assignedRows.filter((row) => row.intel.personality === "high").length,
    defensiveCrewCount: assignedRows.filter(
      (row) => row.intel.personality === "defensive",
    ).length,
    avgConfidencePct,
    topSignal: top
      ? {
          matchup: compactMatchupLabel(top.game),
          whistleDelta: top.intel.whistleDelta,
          whistleDeltaLabel: top.intel.whistleDeltaLabel,
          confidencePct: top.intel.confidencePct,
          signalTierLabel: top.intel.signalTierLabel,
        }
      : null,
  };
}

function homepageSlateRank(game: OverviewSlateEntry, now: Date): number {
  if (isSlateGameLive(game)) return 0;
  if (!isSlateGameFinal(game) && hasRefAssignments(game) && isTodaySlateGame(game, now)) {
    return 1;
  }
  if (isSlateGameFinal(game)) return 2;
  if (!hasRefAssignments(game)) return 4;
  return 3;
}

function homepageSlateSortKey(game: OverviewSlateEntry): number {
  return resolveGameTimestampMs(game) ?? Number.MAX_SAFE_INTEGER;
}

export function sortSlateGamesBySignal(
  games: OverviewSlateEntry[],
  now: Date = new Date(),
): OverviewSlateEntry[] {
  return [...games].sort((left, right) => {
    const rankDelta = homepageSlateRank(left, now) - homepageSlateRank(right, now);
    if (rankDelta !== 0) return rankDelta;

    const timeDelta = homepageSlateSortKey(left) - homepageSlateSortKey(right);
    if (timeDelta !== 0) return timeDelta;

    return left.matchup.localeCompare(right.matchup);
  });
}

export function partitionHomepageSlateGames(
  games: OverviewSlateEntry[],
): HomepageSlatePartition {
  const sorted = sortSlateGamesBySignal(games);
  const primaryGames: OverviewSlateEntry[] = [];
  const pendingGames: OverviewSlateEntry[] = [];

  for (const game of sorted) {
    if (!hasRefAssignments(game) && !isSlateGameLive(game) && !isSlateGameFinal(game)) {
      pendingGames.push(game);
    } else {
      primaryGames.push(game);
    }
  }

  return { primaryGames, pendingGames };
}
