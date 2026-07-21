import {
  buildCrewBaselineHeadline,
  calculateConfidencePct,
  calculateEvidenceStrength,
  classifyEvidenceImpact,
  createEvidenceDriver,
  normalizeModelContributions,
  round1,
  type EvidenceDirection,
  type EvidenceDriver,
  type ModelContribution,
  type ProjectionEvidencePayload,
} from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { formatSigned } from "@/lib/stats-utils";

const MIN_REF_TEAM_GAMES = 5;

function directionFromDelta(delta: number): EvidenceDirection {
  return delta >= 0 ? "INCREASE" : "DECREASE";
}

function crewDriver(preview: GameSlatePreviewPayload): EvidenceDriver | null {
  if (preview.insufficientSample || Math.abs(preview.foulsDelta) < 0.4) return null;
  const leagueBaseline = preview.avgFouls - preview.foulsDelta;
  const direction = directionFromDelta(preview.foulsDelta);
  return createEvidenceDriver({
    feature: "crew_baseline",
    impact: classifyEvidenceImpact(preview.foulsDelta, leagueBaseline),
    direction,
    headline: buildCrewBaselineHeadline(
      preview.foulsDelta,
      preview.sampleGames,
      preview.whistleLabel,
      leagueBaseline,
    ),
    detail: `Crew sample: ${preview.sampleGames} games. Observed average ${round1(preview.avgFouls)} ${preview.whistleLabel.toLowerCase()} per game.`,
    value: preview.avgFouls,
    baseline: leagueBaseline,
    tooltip: `Crew Baseline: Average ${preview.whistleLabel.toLowerCase()} called over previous ${preview.sampleGames} games vs league average ${round1(leagueBaseline)}.`,
  });
}

function teamDrivers(preview: GameSlatePreviewPayload): EvidenceDriver[] {
  const drivers: EvidenceDriver[] = [];

  for (const impact of preview.teamImpacts) {
    for (const insight of impact.insights) {
      if (!insight.foulsDeltaCritical && Math.abs(insight.foulsDelta) < 1) continue;
      const row = preview.refTeamRows.find(
        (candidate) =>
          candidate.refSlug === insight.refSlug &&
          candidate.teamAbbr === impact.teamAbbr,
      );
      if (!row || row.games < MIN_REF_TEAM_GAMES) continue;

      const direction = directionFromDelta(insight.foulsDelta);
      drivers.push(
        createEvidenceDriver({
          feature: `team_${impact.teamAbbr.toLowerCase()}_foul_delta`,
          impact: classifyEvidenceImpact(insight.foulsDelta, preview.avgFouls),
          direction,
          headline: `${impact.teamAbbr} games with this crew average ${formatSigned(insight.foulsDelta)} ${preview.whistleLabel.toLowerCase()} vs crew baseline (${row.games} games)`,
          detail: `${insight.refName} sample with ${impact.teamLabel}.`,
          value: preview.avgFouls + insight.foulsDelta,
          baseline: preview.avgFouls,
          tooltip: `Team Split: ${impact.teamAbbr} ref-team history over ${row.games} shared games.`,
        }),
      );
    }
  }

  return drivers;
}

function historicalDrivers(preview: GameSlatePreviewPayload): EvidenceDriver[] {
  const drivers: EvidenceDriver[] = [];

  for (const row of preview.refTeamRows) {
    if (!row.isOutlier || row.games < MIN_REF_TEAM_GAMES) continue;
    const direction = directionFromDelta(row.foulsDelta);
    drivers.push(
      createEvidenceDriver({
        feature: `historical_${row.refSlug}_${row.teamAbbr}`,
        impact: classifyEvidenceImpact(row.foulsDelta, preview.avgFouls),
        direction,
        headline: `${row.refName} with ${row.teamAbbr}: ${formatSigned(row.foulsDelta)} ${preview.whistleLabel.toLowerCase()} vs crew average across ${row.games} games`,
        detail: row.outlierNote ?? `Historical ref-team pairing sample.`,
        value: preview.avgFouls + row.foulsDelta,
        baseline: preview.avgFouls,
        tooltip: `Historical Matchup: ${row.games} prior games in this ref-team pairing.`,
      }),
    );
  }

  return drivers.slice(0, 4);
}

function scoringContextDriver(preview: GameSlatePreviewPayload): EvidenceDriver | null {
  if (preview.insufficientSample || Math.abs(preview.totalPointsDelta) < 2.5) {
    return null;
  }

  const leagueBaseline = preview.avgTotalPoints - preview.totalPointsDelta;
  const direction = directionFromDelta(preview.totalPointsDelta);
  return createEvidenceDriver({
    feature: "scoring_pace",
    impact: classifyEvidenceImpact(preview.totalPointsDelta, leagueBaseline),
    direction,
    headline: `Crew averaged ${formatSigned(preview.totalPointsDelta)} ${preview.scoringLabel.toLowerCase()} vs league baseline over last ${preview.sampleGames} games`,
    detail: `Pace context from ${preview.sampleGames} crew games.`,
    value: preview.avgTotalPoints,
    baseline: leagueBaseline,
    tooltip: `Scoring Pace: Combined points relative to league baseline in this crew sample.`,
  });
}

function splitDrivers(drivers: EvidenceDriver[]): {
  factorsIncreasing: EvidenceDriver[];
  factorsReducing: EvidenceDriver[];
} {
  return {
    factorsIncreasing: drivers.filter((driver) => driver.direction === "INCREASE"),
    factorsReducing: drivers.filter((driver) => driver.direction === "DECREASE"),
  };
}

function modelContributions(
  preview: GameSlatePreviewPayload,
  crew: EvidenceDriver | null,
  teams: EvidenceDriver[],
  historical: EvidenceDriver[],
): ModelContribution[] {
  const hasCrew = crew ? 1 : 0;
  const hasTeams = teams.length > 0 ? 1 : 0;
  const hasHistorical = historical.length > 0 ? 1 : 0;
  const hasVenue = preview.homeBiasHeadline ? 1 : 0;
  const hasRest = 0;

  const raw: ModelContribution[] = [
    { factor: "Crew", percentage: hasCrew ? 38 : 0 },
    { factor: "Teams", percentage: hasTeams ? 28 + teams.length * 2 : 0 },
    {
      factor: "Historical Matchups",
      percentage: hasHistorical ? 18 + historical.length * 3 : 0,
    },
    { factor: "Rest/Travel", percentage: hasRest ? 8 : 0 },
    { factor: "Venue", percentage: hasVenue ? 10 : 0 },
  ];

  const filtered = raw.filter((row) => row.percentage > 0);
  if (filtered.length === 0) {
    return [{ factor: "Crew", percentage: 100 }];
  }
  return normalizeModelContributions(filtered);
}

function projectionDirection(
  factorsIncreasing: EvidenceDriver[],
  factorsReducing: EvidenceDriver[],
  foulsDelta: number,
): EvidenceDirection {
  if (factorsIncreasing.length !== factorsReducing.length) {
    return factorsIncreasing.length > factorsReducing.length
      ? "INCREASE"
      : "DECREASE";
  }
  return directionFromDelta(foulsDelta);
}

function estimateProjection(
  preview: GameSlatePreviewPayload,
  direction: EvidenceDirection,
): number {
  const adjustment =
    direction === "INCREASE"
      ? Math.max(preview.foulsDelta, 0)
      : Math.min(preview.foulsDelta, 0);
  return round1(preview.avgFouls + adjustment * 0.65);
}

export function buildProjectionEvidence(
  preview: GameSlatePreviewPayload,
  options?: { clusterAccuracyPct?: number; clusterSampleGames?: number },
): ProjectionEvidencePayload {
  const crew = crewDriver(preview);
  const teams = teamDrivers(preview);
  const historical = historicalDrivers(preview);
  const scoring = scoringContextDriver(preview);

  const allDrivers = [crew, scoring, ...teams, ...historical].filter(
    (driver): driver is EvidenceDriver => driver !== null,
  );
  const { factorsIncreasing, factorsReducing } = splitDrivers(allDrivers);
  const direction = projectionDirection(
    factorsIncreasing,
    factorsReducing,
    preview.foulsDelta,
  );

  const evidenceStrength = calculateEvidenceStrength({
    sampleGames: preview.sampleGames,
    factorsIncreasing,
    factorsReducing,
    projectionDirection: direction,
    completenessRatio: allDrivers.length / 6,
    valueSigma: Math.abs(preview.foulsDelta) > 0 ? 1.1 : 2.2,
  });

  const confidencePct = calculateConfidencePct({
    evidenceStrength,
    sampleGames: preview.sampleGames,
    clusterAccuracyPct: options?.clusterAccuracyPct,
    clusterSampleGames: options?.clusterSampleGames,
  });

  return {
    projection: estimateProjection(preview, direction),
    confidencePct,
    evidenceStrength,
    modelContribution: modelContributions(preview, crew, teams, historical),
    factorsIncreasing,
    factorsReducing,
    metricLabel: preview.whistleLabel,
  };
}
