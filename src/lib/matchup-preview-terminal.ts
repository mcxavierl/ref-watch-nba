import type {
  EvidenceDriver,
  ModelContribution,
  ProjectionEvidencePayload,
} from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  whistlePersonality,
  type WhistlePersonality,
} from "@/lib/slate-intelligence";

export type MatchupVerdictHeadline = {
  personality: WhistlePersonality;
  label: string;
};

export type MatchupTerminalMetric = {
  label: string;
  value: string;
  meta?: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
};

export type MatchupDriverLine = {
  id: string;
  direction: "increase" | "decrease";
  label: string;
  deltaTag: string;
  tone: "positive" | "negative";
};

export type MatchupCrewRosterEntry = {
  slug: string;
  name: string;
  deltaLabel?: string;
};

export type MatchupMatrixCell = {
  foulsDeltaLabel: string;
  winRateLabel: string;
  foulsTone: "positive" | "negative" | "neutral";
  winRateTone: "positive" | "negative" | "neutral";
  empty?: boolean;
};

export type MatchupMatrixRow = {
  refSlug: string;
  officialLabel: string;
  away: MatchupMatrixCell;
  home: MatchupMatrixCell;
};

export type MatchupRawFactorLine = {
  id: string;
  direction: "increase" | "decrease";
  headline: string;
  detail: string;
};

export type CrewDnaImpactDirectiveId = "free_throw_volume" | "home_advantage" | "game_pace";

export type CrewDnaImpactDirective = {
  id: CrewDnaImpactDirectiveId;
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral" | "signal";
};

export type CrewDnaSynthesisPayload = {
  synthesisLine: string;
  directives: CrewDnaImpactDirective[];
};

const CONTRIBUTION_LABELS: Record<ModelContribution["factor"], string> = {
  Crew: "Crew Weight",
  Teams: "Team Weight",
  "Historical Matchups": "Matchup History",
  "Rest/Travel": "Rest/Travel",
  Venue: "Venue",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function deltaTone(delta: number): "positive" | "negative" | "neutral" {
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

function winRateTone(winRate: number): "positive" | "negative" | "neutral" {
  if (winRate >= 0.55) return "positive";
  if (winRate <= 0.45) return "negative";
  return "neutral";
}

export function buildMatchupVerdictHeadline(
  preview: GameSlatePreviewPayload,
): MatchupVerdictHeadline {
  const personality = whistlePersonality(preview.foulsDelta);
  if (personality === "high") {
    return { personality, label: "High whistle environment" };
  }
  if (personality === "defensive") {
    return { personality, label: "Defensive / low whistle" };
  }
  return { personality, label: "Baseline whistle profile" };
}

export function buildMatchupTerminalMetrics(
  preview: GameSlatePreviewPayload,
  evidence: ProjectionEvidencePayload,
): MatchupTerminalMetric[] {
  const leagueAvg = round1(preview.avgFouls - preview.foulsDelta);
  const projected =
    evidence.projection > 0 ? evidence.projection.toFixed(1) : preview.avgFouls.toFixed(1);
  const leagueLabel = leagueAvg > 0 ? leagueAvg.toFixed(1) : "-";
  const deltaLabel = formatSigned(preview.foulsDelta);

  return [
    {
      label: "Projected whistles",
      value: projected,
      meta: `vs ${leagueLabel} league avg`,
      delta: deltaLabel,
      deltaTone: deltaTone(preview.foulsDelta),
    },
    {
      label: "Model confidence",
      value: `${evidence.confidencePct}%`,
    },
    {
      label: "Evidence score",
      value: `${evidence.evidenceStrength.toFixed(1)} / 10`,
    },
  ];
}

export function buildMatchupTrustSignalBar(
  preview: GameSlatePreviewPayload,
): string {
  const sampleGames = preview.sampleGames > 0 ? preview.sampleGames : "-";
  const crewCount = preview.crew.length > 0 ? preview.crew.length : "-";
  return `${sampleGames} historical games · ${crewCount} crews · Team-specific splits · Baseline adjusted`;
}

function whistleVolumePct(preview: GameSlatePreviewPayload): number {
  const leagueAvg = preview.avgFouls - preview.foulsDelta;
  if (leagueAvg <= 0) return 0;
  return round1((preview.foulsDelta / leagueAvg) * 100);
}

function fingerprintAxis(
  preview: GameSlatePreviewPayload,
  axisId: string,
): number | undefined {
  const axis = preview.crewFingerprints?.[0]?.fingerprint.axes.find(
    (entry) => entry.id === axisId,
  );
  return axis?.percentile;
}

function homeAdvantageDirective(
  preview: GameSlatePreviewPayload,
): CrewDnaImpactDirective {
  const homePercentile = fingerprintAxis(preview, "home_court_disparity");
  const delta =
    homePercentile !== undefined ? round1((homePercentile - 50) / 25) : -0.2;
  const headline = preview.homeBiasHeadline?.toLowerCase() ?? "";

  let label = "Neutral";
  if (headline.includes("suppress") || headline.includes("less") || delta <= -0.35) {
    label = "Neutral";
  } else if (headline.includes("cover") || headline.includes("more") || delta >= 0.35) {
    label = "Elevated";
  }

  return {
    id: "home_advantage",
    label: "Home Advantage",
    value: `${label} (${formatSigned(delta)} delta)`,
    tone: Math.abs(delta) < 0.25 ? "neutral" : delta > 0 ? "positive" : "negative",
  };
}

function gamePaceDirective(
  preview: GameSlatePreviewPayload,
): CrewDnaImpactDirective {
  const pacePercentile = fingerprintAxis(preview, "pace_acceleration");
  if (
    preview.totalPointsDelta >= 2 ||
    preview.foulsDelta >= 1.2 ||
    (pacePercentile !== undefined && pacePercentile >= 58)
  ) {
    return {
      id: "game_pace",
      label: "Game Pace",
      value: "Fast transition whistle",
      tone: "signal",
    };
  }
  if (
    preview.totalPointsDelta <= -2 ||
    preview.foulsDelta <= -1.2 ||
    (pacePercentile !== undefined && pacePercentile <= 42)
  ) {
    return {
      id: "game_pace",
      label: "Game Pace",
      value: "Slow whistle cadence",
      tone: "neutral",
    };
  }
  return {
    id: "game_pace",
    label: "Game Pace",
    value: "Standard transition pace",
    tone: "neutral",
  };
}

export function buildCrewDnaSynthesis(
  preview: GameSlatePreviewPayload,
): CrewDnaSynthesisPayload {
  const volumePct = whistleVolumePct(preview);
  const volumePhrase =
    Math.abs(volumePct) < 0.5
      ? "calls whistle volume in line with league baseline"
      : volumePct > 0
        ? `calls +${Math.abs(volumePct).toFixed(1)}% more whistle volume than league baseline`
        : `calls ${Math.abs(volumePct).toFixed(1)}% fewer whistles than league baseline`;

  const homeDirective = homeAdvantageDirective(preview);
  const homeClause =
    homeDirective.tone === "negative" || preview.homeBiasHeadline
      ? " and suppresses home-court margin in high-contact scenarios"
      : homeDirective.tone === "positive"
        ? " and amplifies home-court advantage in tight stretches"
        : "";

  const expectedFts = round1(Math.abs(preview.foulsDelta) * 2.6);
  const ftSign = preview.foulsDelta >= 0 ? "+" : "-";

  return {
    synthesisLine: `RefWatch Synthesis: This crew ${volumePhrase}${homeClause}.`,
    directives: [
      {
        id: "free_throw_volume",
        label: "Free Throw Volume",
        value: `${ftSign}${expectedFts.toFixed(1)} expected FTs`,
        tone:
          preview.foulsDelta >= 0.5
            ? "positive"
            : preview.foulsDelta <= -0.5
              ? "negative"
              : "neutral",
      },
      homeDirective,
      gamePaceDirective(preview),
    ],
  };
}

export function buildOfficiatingFingerprintTechnicalLines(
  preview: GameSlatePreviewPayload,
): string[] {
  const fingerprint = preview.crewFingerprints?.[0]?.fingerprint;
  if (!fingerprint) return [];
  return fingerprint.axes.map(
    (axis) =>
      `${axis.label}: ${axis.percentile} pct (league avg ${axis.leagueAveragePercentile} pct)`,
  );
}

function driverDelta(driver: EvidenceDriver): number {
  return round1(driver.value - driver.baseline);
}

function driverLabel(driver: EvidenceDriver): string {
  if (driver.feature === "crew_baseline") return "Crew historical baseline";
  if (driver.feature === "scoring_pace") return "Scoring pace adjustment";
  if (driver.feature.startsWith("team_")) {
    const team = driver.feature.match(/^team_([a-z0-9]+)_/)?.[1]?.toUpperCase();
    return team ? `${team} pace adjustment` : "Team split pressure";
  }
  if (driver.feature.startsWith("historical_")) return "Historical matchup";
  return driver.headline.split(".")[0]?.trim() ?? driver.headline;
}

function impactRank(impact: EvidenceDriver["impact"]): number {
  if (impact === "HIGH") return 3;
  if (impact === "MEDIUM") return 2;
  return 1;
}

function formatDriverLine(driver: EvidenceDriver): MatchupDriverLine {
  const delta = driverDelta(driver);
  const tone = driver.direction === "INCREASE" ? "positive" : "negative";
  return {
    id: `${driver.feature}-${driver.headline}`,
    direction: driver.direction === "INCREASE" ? "increase" : "decrease",
    label: driverLabel(driver),
    deltaTag: formatSigned(delta),
    tone,
  };
}

export function buildMatchupDriverLines(
  evidence: ProjectionEvidencePayload,
  limit = 3,
): {
  positive: MatchupDriverLine[];
  negative: MatchupDriverLine[];
} {
  const positive = evidence.factorsIncreasing
    .slice()
    .sort(
      (left, right) =>
        impactRank(right.impact) - impactRank(left.impact) ||
        Math.abs(driverDelta(right)) - Math.abs(driverDelta(left)),
    )
    .slice(0, limit)
    .map(formatDriverLine);

  const negative = evidence.factorsReducing
    .slice()
    .sort(
      (left, right) =>
        impactRank(right.impact) - impactRank(left.impact) ||
        Math.abs(driverDelta(right)) - Math.abs(driverDelta(left)),
    )
    .slice(0, limit)
    .map(formatDriverLine);

  return { positive, negative };
}

function averageRefFoulsDelta(
  preview: GameSlatePreviewPayload,
  refSlug: string,
): number | undefined {
  const rows = preview.refTeamRows.filter((row) => row.refSlug === refSlug);
  if (rows.length === 0) return undefined;
  const total = rows.reduce((sum, row) => sum + row.foulsDelta, 0);
  return round1(total / rows.length);
}

export function buildMatchupCrewRoster(
  preview: GameSlatePreviewPayload,
): MatchupCrewRosterEntry[] {
  return preview.crew.map((official) => {
    const avgDelta = averageRefFoulsDelta(preview, official.slug);
    return {
      slug: official.slug,
      name: official.name,
      deltaLabel:
        avgDelta !== undefined && Math.abs(avgDelta) >= 0.05
          ? formatSigned(avgDelta)
          : avgDelta === 0
            ? formatSigned(0)
            : undefined,
    };
  });
}

function shortOfficialName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`;
}

function matrixCell(
  preview: GameSlatePreviewPayload,
  refSlug: string,
  teamAbbr: string,
): MatchupMatrixCell {
  const row = preview.refTeamRows.find(
    (candidate) => candidate.refSlug === refSlug && candidate.teamAbbr === teamAbbr,
  );
  if (!row || row.games < 1) {
    return {
      foulsDeltaLabel: "--",
      winRateLabel: "--",
      foulsTone: "neutral",
      winRateTone: "neutral",
      empty: true,
    };
  }

  return {
    foulsDeltaLabel: formatSigned(row.foulsDelta),
    winRateLabel: formatPct(row.winRate),
    foulsTone: deltaTone(row.foulsDelta),
    winRateTone: winRateTone(row.winRate),
  };
}

export function buildMatchupMatrixRows(
  preview: GameSlatePreviewPayload,
): {
  awayAbbr: string;
  homeAbbr: string;
  rows: MatchupMatrixRow[];
} {
  const awayAbbr = preview.awayAbbr ?? preview.awayTeam;
  const homeAbbr = preview.homeAbbr ?? preview.homeTeam;

  const rows = preview.crew.map((official) => ({
    refSlug: official.slug,
    officialLabel: shortOfficialName(official.name),
    away: matrixCell(preview, official.slug, awayAbbr),
    home: matrixCell(preview, official.slug, homeAbbr),
  }));

  return { awayAbbr, homeAbbr, rows };
}

export function buildModelWeightLines(
  contributions: ModelContribution[],
): string[] {
  return contributions.map(
    (row) => `${CONTRIBUTION_LABELS[row.factor]}: ${row.percentage}%`,
  );
}

export function buildRawFactorLines(
  evidence: ProjectionEvidencePayload,
): MatchupRawFactorLine[] {
  const increasing = evidence.factorsIncreasing.map((driver) => ({
    id: `inc-${driver.feature}`,
    direction: "increase" as const,
    headline: driver.headline,
    detail: driver.detail,
  }));
  const reducing = evidence.factorsReducing.map((driver) => ({
    id: `dec-${driver.feature}`,
    direction: "decrease" as const,
    headline: driver.headline,
    detail: driver.detail,
  }));
  return [...increasing, ...reducing];
}

export function buildSupplementalContextLines(
  preview: GameSlatePreviewPayload,
): string[] {
  const lines: string[] = [];
  if (preview.homeBiasHeadline) lines.push(preview.homeBiasHeadline);
  for (const story of preview.storylines) {
    lines.push(`${story.headline}: ${story.summary}`);
  }
  if (!preview.insufficientSample) {
    lines.push(
      `Scoring impact: ${formatSigned(preview.totalPointsDelta)} · Over rate: ${formatPct(preview.overRate)} · Fouls/game: ${preview.avgFouls.toFixed(1)}`,
    );
  }
  return lines;
}
