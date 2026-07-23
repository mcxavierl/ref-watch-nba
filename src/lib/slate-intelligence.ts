import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { formatSlateDateTimeLabel } from "@/lib/slate-team-display";
import { formatPct, formatSigned } from "@/lib/stats-utils";

export const SLATE_MODEL_VERSION = "3.8";

export type WhistlePersonality = "high" | "defensive" | "neutral";

export type SlateDeltaTooltip = {
  crewBaseline: number;
  historicalMatchup: number;
  teamSplitPressure: number;
};

export type SignalTier = "high" | "elevated" | "standard" | "pending";

export type SlateHistoricalMatchupBaseline = {
  title: string;
  lines: string[];
};

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
  gamesMonitored: number;
  highWhistleCount: number;
  defensiveCrewCount: number;
  avgConfidencePct: number;
  topSignal: {
    matchup: string;
    whistleDelta: number;
    whistleDeltaLabel: string;
    confidencePct: number;
    signalTierLabel: string;
  } | null;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function compactMatchupLabel(game: OverviewSlateEntry): string {
  return `${game.awayTeam} @ ${game.homeTeam}`;
}

/** True when an officiating crew is assigned and whistle model panels may render. */
export function hasRefAssignments(game: OverviewSlateEntry): boolean {
  const officials = game.preview?.crew ?? [];

  if (
    game.preview?.awaitingCrew === true &&
    officials.length === 0 &&
    game.crewCount === 0
  ) {
    return false;
  }

  const crewChief =
    game.headRef ??
    officials.find((official) => official.role === "crew_chief")?.name ??
    officials.find((official) => official.role === "referee")?.name;
  const crewPending =
    game.preview?.awaitingCrew === true ||
    (game.crewCount === 0 && officials.length === 0 && !crewChief);
  const hasRefs = game.crewCount > 0 || officials.length > 0;

  return Boolean(officials.length > 0 || crewChief || (!crewPending && hasRefs));
}

export function buildHistoricalMatchupBaseline(
  game: OverviewSlateEntry,
): SlateHistoricalMatchupBaseline {
  const preview = game.preview;
  const briefing = preview?.matchupBriefing;
  const scoringLabel = preview?.scoringLabel?.toLowerCase() ?? "points";
  const whistleLabel = preview?.whistleLabel?.toLowerCase() ?? "fouls";
  const lines: string[] = [];

  if (briefing && briefing.h2hGames > 0) {
    const window = Math.min(briefing.h2hGames, 5);
    lines.push(
      `Last ${window} meeting${window === 1 ? "" : "s"}: ${briefing.avgTotalPoints} avg ${scoringLabel} · ${briefing.avgFouls} avg ${whistleLabel}`,
    );
    lines.push(
      `Head-to-head record: ${game.awayTeam} vs ${game.homeTeam} · ${formatPct(briefing.overRate)} over`,
    );
    if (briefing.lastMeeting) {
      lines.push(briefing.lastMeeting);
    }
  } else {
    for (const candidate of [
      game.lastMeetingLine,
      game.gameContextLine,
      game.matchupInsight,
      game.teamContextLine,
    ]) {
      if (candidate?.trim()) {
        lines.push(candidate.trim());
      }
    }
  }

  if (lines.length === 0) {
    lines.push(
      `${game.awayTeam} vs ${game.homeTeam} · Team matchup history available on click`,
    );
  }

  return {
    title: "HISTORICAL TEAM MATCHUP",
    lines: lines.slice(0, 3),
  };
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
  if (confidencePct >= 55 || absDelta >= 1.0) {
    return { tier: "elevated", label: "[ELEVATED]" };
  }
  return { tier: "standard", label: "[STANDARD]" };
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
  if (game.gamePhase === "live" || game.status === "live") {
    const period = game.gamePeriod?.trim();
    const clock = game.gameClock?.trim();
    const detail = [period, clock].filter(Boolean).join(" · ");
    return {
      kind: "live",
      label: detail ? `Live · ${detail}` : "Live",
    };
  }

  if (game.gamePhase === "final" || game.status === "final") {
    return { kind: "final", label: "Final" };
  }

  const dateTimeLabel = formatSlateDateTimeLabel(game.slateDate, game.slateStartAt);
  return {
    kind: "pregame",
    label: dateTimeLabel ? `Pregame · ${dateTimeLabel}` : "Pregame",
  };
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

function pendingCrewIntelligence(game: OverviewSlateEntry): SlateGameIntelligence {
  const status = statusForGame(game);
  return {
    personality: "neutral",
    verdictHeadline: "Historical team matchup",
    expectedWhistles: 0,
    leagueAvgWhistles: 0,
    whistleDelta: 0,
    whistleDeltaLabel: formatSigned(0),
    confidencePct: 0,
    evidenceScore: 0,
    signalTier: "pending",
    signalTierLabel: "CREW PENDING",
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

function fallbackIntelligence(game: OverviewSlateEntry): SlateGameIntelligence {
  const status = statusForGame(game);
  const signalTier = signalTierFromConfidence(0, 0);
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
  const signalTier = signalTierFromConfidence(evidence.confidencePct, preview.foulsDelta);
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
      gamesMonitored: 0,
      highWhistleCount: 0,
      defensiveCrewCount: 0,
      avgConfidencePct: 0,
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
      : 0;

  const ranked = [...assignedRows].sort(
    (left, right) => right.intel.signalScore - left.intel.signalScore,
  );
  const top = ranked[0];

  return {
    gamesMonitored: games.length,
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

export function sortSlateGamesBySignal(
  games: OverviewSlateEntry[],
): OverviewSlateEntry[] {
  return [...games].sort((left, right) => {
    const leftLive =
      left.status === "live" || left.gamePhase === "live" ? 1 : 0;
    const rightLive =
      right.status === "live" || right.gamePhase === "live" ? 1 : 0;
    if (leftLive !== rightLive) return rightLive - leftLive;

    const leftScore = buildSlateGameIntelligence(left).signalScore;
    const rightScore = buildSlateGameIntelligence(right).signalScore;
    if (leftScore !== rightScore) return rightScore - leftScore;

    const leftTs = left.slateStartAt ?? left.slateDate ?? "";
    const rightTs = right.slateStartAt ?? right.slateDate ?? "";
    return leftTs.localeCompare(rightTs);
  });
}
