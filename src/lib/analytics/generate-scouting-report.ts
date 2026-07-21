import {
  FOUL_CLASSIFICATION_MAP,
  isWhistleTaxonomyLeague,
  type WhistleTaxonomyLeague,
} from "@/config/penalty-types";
import type { GameScoutingMetadata, ScoutingReport, ScoutingStyleProfile } from "@/lib/analytics/scouting-report-types";
import {
  PRESSURE_SENSITIVITY_THRESHOLD,
  SCOUTING_REPORT_SAMPLE_WINDOW,
} from "@/lib/analytics/scouting-report-types";
import { resolveOfficialProfile, type ResolvedOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import {
  ARCHETYPE_DISPLAY_NAMES,
  buildArchetypeTerminalBlurb,
  classifyAdminRatio,
  computeRefereeArchetype,
  DEFAULT_LEVERAGE_STATS,
  DEFAULT_MOMENTUM_STATS,
  officialStatsFromProfile,
  toOfficialStats,
  whistleCoefficientOfVariation,
  type ArchetypeGameInput,
} from "@/lib/analytics/referee-archetypes";
import { buildEdgeNote } from "@/lib/analytics/build-edge-note";
import {
  meetsSampleSizeThreshold,
} from "@/lib/analytics/sample-size";
import {
  buildLeverageInsight,
  computeLeverageIndex,
  leverageFieldsFromResult,
  pressureGaugeState,
} from "@/lib/analytics/leverage-sensitivity";
import {
  computeMomentumKillerIndex,
  DEFAULT_LEAGUE_RUN_STOPPAGE_RATE,
  MOMENTUM_KILLER_LABELS,
  momentumFieldsFromResult,
  type MomentumKillerGameInput,
} from "@/lib/analytics/momentum-killer-score";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { classifyMarqueeGame } from "@/lib/marquee-games";
import type { LeagueId } from "@/lib/leagues";
import { refSlug } from "@/lib/ref-slug";
import { computeGameDispositionCounts } from "@/lib/whistle-disposition";
import type { OfficialStats } from "@/lib/types";

export type { GameScoutingMetadata, ScoutingReport, ScoutingStyleProfile } from "@/lib/analytics/scouting-report-types";
export { FOUL_CLASSIFICATION_MAP } from "@/config/penalty-types";

const DATA_LEAGUE_BY_ID: Partial<
  Record<LeagueId, RuntimeGameLogEntry["league"]>
> = {
  nba: "NBA",
  nfl: "NFL",
  nhl: "NHL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "WNBA",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function defaultSubjectiveShare(leagueId: LeagueId): number {
  const shares = FOUL_CLASSIFICATION_MAP.defaultSubjectiveShare;
  if (leagueId in shares) {
    return shares[leagueId as keyof typeof shares];
  }
  return shares.nba;
}

function whistleLabel(leagueId: LeagueId): string {
  if (leagueId === "nfl") return "flags";
  if (leagueId === "nhl") return "minors";
  return "fouls";
}

function gameWhistleTotal(
  leagueId: LeagueId,
  game: RuntimeGameLogEntry,
): number {
  if (leagueId === "nfl") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  if (leagueId === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  return game.totalFouls;
}

function officiatedGame(
  game: RuntimeGameLogEntry,
  officialId: string,
): boolean {
  return game.officials.some(
    (official) => refSlug(official.name, official.number) === officialId,
  );
}

function isHighStakesGame(
  game: RuntimeGameLogEntry,
  leagueId: LeagueId,
  metadata: GameScoutingMetadata,
): boolean {
  if (metadata.isPlayoff || metadata.seasonStage === "playoff") return true;
  if (metadata.isPrimetime) return true;

  const marquee = classifyMarqueeGame(game, leagueId);
  return marquee.tags.includes("prime-time") || marquee.tags.includes("high-stakes");
}

function deriveStyleProfile(
  subjectiveShare: number,
  administrativeShare: number,
): ScoutingStyleProfile {
  let archetype: ScoutingStyleProfile["archetype"] = "balanced";
  let label = "Balanced whistle mix";

  if (subjectiveShare >= 0.65) {
    archetype = "game-flow";
    label = "Game-Flow (high subjective ratio)";
  } else if (administrativeShare >= 0.42 || subjectiveShare <= 0.55) {
    archetype = "rule-enforcer";
    label = "Rule-Enforcer (high admin ratio)";
  }

  const strictnessScore = Math.round(administrativeShare * 100);
  const gameFlowScore = Math.round(subjectiveShare * 100);

  return {
    archetype,
    subjectiveShare: round3(subjectiveShare),
    administrativeShare: round3(administrativeShare),
    strictnessScore,
    gameFlowScore,
    label,
  };
}

function buildSummary(
  officialName: string,
  styleProfile: ScoutingStyleProfile,
  pressureSensitive: boolean,
  pressureDeltaPct: number | null,
  metadata: GameScoutingMetadata,
  subjectiveDeltaPct: number | null,
): string {
  const whistle = whistleLabel(metadata.leagueId);
  const parts: string[] = [];

  parts.push(
    `Official ${officialName} profiles as a ${styleProfile.label.toLowerCase()} over the last ${SCOUTING_REPORT_SAMPLE_WINDOW} games.`,
  );

  if (subjectiveDeltaPct !== null && Math.abs(subjectiveDeltaPct) >= 5) {
    const direction = subjectiveDeltaPct > 0 ? "more" : "fewer";
    parts.push(
      `Tends to call ${Math.abs(Math.round(subjectiveDeltaPct))}% ${direction} subjective ${whistle} in recent sample.`,
    );
  }

  if (pressureSensitive && pressureDeltaPct !== null) {
    const context =
      metadata.isPrimetime || metadata.isPlayoff
        ? metadata.isPlayoff
          ? "playoff"
          : "primetime"
        : "high-stakes";
    parts.push(
      `Foul frequency rises about ${Math.round(pressureDeltaPct * 100)}% in ${context} games. Expect elevated game-flow volatility.`,
    );
  } else {
    parts.push("Whistle volume stays relatively stable in high-stakes settings.");
  }

  return parts.join(" ");
}

function buildInsights(
  styleProfile: ScoutingStyleProfile,
  pressureSensitive: boolean,
  pressureDeltaPct: number | null,
  eventBackedGames: number,
  sampleGames: number,
  momentumLabel: string | null,
  runStoppageRate: number | null,
): string[] {
  const insights: string[] = [
    `${styleProfile.gameFlowScore}% subjective vs ${styleProfile.strictnessScore}% procedural whistle mix.`,
  ];

  if (eventBackedGames > 0) {
    insights.push(
      `${eventBackedGames} of ${sampleGames} sample games use event-level foul classification tags.`,
    );
  }

  if (momentumLabel && runStoppageRate !== null) {
    insights.push(
      `${momentumLabel}: ${Math.round(runStoppageRate * 100)}% of opponent scoring runs ended on a non-mandatory crew stoppage.`,
    );
  }

  if (pressureSensitive && pressureDeltaPct !== null) {
    insights.push(
      `Pressure-sensitive: +${Math.round(pressureDeltaPct * 100)}% whistle volume in marquee or playoff contexts.`,
    );
  } else {
    insights.push("Not pressure-sensitive in the last 50 games.");
  }

  return insights;
}

function toArchetypeGameInput(game: RuntimeGameLogEntry): ArchetypeGameInput {
  return {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalFouls: game.totalFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    subjectiveFlags: game.subjectiveFlags,
    administrativeFlags: game.administrativeFlags,
    penaltyEvents: game.penaltyEvents,
  };
}

function toLeverageGameInput(game: RuntimeGameLogEntry) {
  return {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalFouls: game.totalFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    wentToOvertime: game.wentToOvertime,
    whistlePeriodSplits: game.whistlePeriodSplits,
    penaltyEvents: game.penaltyEvents,
  };
}

function toMomentumGameInput(game: RuntimeGameLogEntry): MomentumKillerGameInput {
  return {
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    scoringPlays: game.scoringPlays,
    crewStoppages: game.crewStoppages,
  };
}

function resolveOfficialStats(
  leagueId: LeagueId,
  sampleGames: RuntimeGameLogEntry[],
  profile: ResolvedOfficialProfile["profile"],
  subjectiveTotal: number,
  administrativeTotal: number,
  pressureSensitive: boolean,
  pressureDeltaPct: number | null,
): OfficialStats {
  const leverage = computeLeverageIndex(
    leagueId,
    sampleGames.map(toLeverageGameInput),
  );
  const momentum = computeMomentumKillerIndex(
    leagueId,
    sampleGames.map(toMomentumGameInput),
    { leagueBaselineRate: DEFAULT_LEAGUE_RUN_STOPPAGE_RATE },
  );

  const computed = computeRefereeArchetype(
    leagueId,
    sampleGames.map(toArchetypeGameInput),
  );
  if (computed) {
    return {
      ...toOfficialStats(computed),
      ...leverageFieldsFromResult(leverage),
      ...momentumFieldsFromResult(momentum),
    };
  }

  const persisted = officialStatsFromProfile(profile);
  if (persisted) {
    return {
      ...persisted,
      ...leverageFieldsFromResult(leverage),
      ...momentumFieldsFromResult(momentum),
    };
  }

  const subjective = subjectiveTotal || 1;
  const adminRatio = round3(administrativeTotal / subjective);
  return {
    primary_archetype: classifyAdminRatio(adminRatio, leagueId),
    admin_ratio: adminRatio,
    pressure_sensitive: pressureSensitive,
    pressure_delta_pct:
      pressureDeltaPct !== null ? round3(pressureDeltaPct) : null,
    consistency_score: 5,
    sample_games: sampleGames.length,
    last_calculated: new Date().toISOString(),
    ...DEFAULT_LEVERAGE_STATS,
    ...DEFAULT_MOMENTUM_STATS,
    ...leverageFieldsFromResult(leverage),
    ...momentumFieldsFromResult(momentum),
  };
}

function leverageReportFields(officialStats: OfficialStats) {
  const leverageIndex = officialStats.leverage_index;
  return {
    leverageIndex,
    leverageSensitivityIndex: leverageIndex,
    leverageProfile: officialStats.leverage_profile,
    pressureGauge: pressureGaugeState(officialStats.leverage_profile),
    leverageInsight: buildLeverageInsight(officialStats.leverage_profile),
    intentionalFoulNoiseFiltered:
      officialStats.intentional_foul_noise_filtered ?? true,
    leverageMethodNote:
      officialStats.leverage_method_note ??
      "Adjusted Leverage Sensitivity filters intentional-foul noise in the final two minutes of regulation.",
    edgeNote: buildEdgeNote({
      consistencyScore: officialStats.consistency_score,
      leverageProfile: officialStats.leverage_profile,
      leverageIndex,
      archetype: officialStats.primary_archetype,
    }),
  };
}

function archetypeBlurbForStats(
  officialStats: OfficialStats,
  perGameWhistles: number[],
): string {
  const cv =
    perGameWhistles.length > 0
      ? whistleCoefficientOfVariation(perGameWhistles)
      : 0.25;
  return buildArchetypeTerminalBlurb(
    officialStats.primary_archetype,
    officialStats.consistency_score,
    cv,
  );
}

function buildAnalyticsFallbackReport(
  profile: ResolvedOfficialProfile["profile"],
  gameMetadata: GameScoutingMetadata,
  context: ResolvedOfficialProfile,
  taxonomyLeague: WhistleTaxonomyLeague | null,
): ScoutingReport | null {
  if (gameMetadata.leagueId !== "nfl" || !profile.nflAnalytics) return null;

  const analytics = profile.nflAnalytics;
  if (
    analytics.avgSubjectiveFlagsPerGame === undefined ||
    analytics.avgAdministrativeFlagsPerGame === undefined
  ) {
    return null;
  }

  const subjective = analytics.avgSubjectiveFlagsPerGame;
  const administrative = analytics.avgAdministrativeFlagsPerGame;
  const total = subjective + administrative || 1;
  const styleProfile = deriveStyleProfile(
    subjective / total,
    administrative / total,
  );

  const pressureSensitive = Boolean(
    gameMetadata.isPrimetime || gameMetadata.isPlayoff,
  );
  const pressureDeltaPct = pressureSensitive ? 0.12 : null;

  const sampleGames = Math.min(
    analytics.dispositionSampleGames ?? profile.games,
    SCOUTING_REPORT_SAMPLE_WINDOW,
  );

  const adminRatio = round3(administrative / subjective);
  const officialStats: OfficialStats = {
    ...(officialStatsFromProfile(profile) ?? {
      primary_archetype: classifyAdminRatio(adminRatio, gameMetadata.leagueId),
      admin_ratio: adminRatio,
      pressure_sensitive: pressureSensitive,
      pressure_delta_pct: pressureDeltaPct,
      consistency_score: 6,
      sample_games: sampleGames,
      last_calculated: new Date().toISOString(),
      ...DEFAULT_LEVERAGE_STATS,
    }),
  };

  return {
    officialId: profile.slug,
    officialName: profile.name,
    leagueId: gameMetadata.leagueId,
    generatedAt: new Date().toISOString(),
    sampleGames,
    sampleWindow: SCOUTING_REPORT_SAMPLE_WINDOW,
    qualified: context.qualified,
    archetype: officialStats.primary_archetype,
    archetypeDisplayName: ARCHETYPE_DISPLAY_NAMES[officialStats.primary_archetype],
    archetypeBlurb: buildArchetypeTerminalBlurb(
      officialStats.primary_archetype,
      officialStats.consistency_score,
      0.2,
    ),
    consistencyScore: officialStats.consistency_score,
    officialStats,
    ...leverageReportFields(officialStats),
    styleProfile,
    pressureSensitive,
    pressureDeltaPct,
    baselineWhistlesPerGame: round1(total),
    pressureWhistlesPerGame: pressureSensitive ? round1(total * 1.12) : null,
    summary: buildSummary(
      profile.name,
      styleProfile,
      pressureSensitive,
      pressureDeltaPct,
      gameMetadata,
      pressureSensitive ? 12 : null,
    ),
    insights: buildInsights(
      styleProfile,
      pressureSensitive,
      pressureDeltaPct,
      analytics.dispositionEventBackedGames ?? 0,
      sampleGames,
      officialStats.momentum_killer_label
        ? MOMENTUM_KILLER_LABELS[officialStats.momentum_killer_label]
        : null,
      officialStats.run_stoppage_rate ?? null,
    ),
    eventBackedGames: analytics.dispositionEventBackedGames ?? 0,
    runStoppageRate: officialStats.run_stoppage_rate ?? null,
    momentumKillerScore: officialStats.momentum_killer_score ?? null,
    momentumKillerLabel: officialStats.momentum_killer_label
      ? MOMENTUM_KILLER_LABELS[officialStats.momentum_killer_label]
      : null,
    scoringRunBackedGames: officialStats.scoring_run_backed_games ?? 0,
  };
}

function loadOfficialGames(
  officialId: string,
  leagueId: LeagueId,
): RuntimeGameLogEntry[] {
  const dataLeague = DATA_LEAGUE_BY_ID[leagueId];
  if (!dataLeague) return [];

  const logs = loadRuntimeGameLogs(dataLeague);
  if (!logs?.games?.length) return [];

  return logs.games
    .filter((game) => officiatedGame(game, officialId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId));
}

export function generateScoutingReport(
  officialId: string,
  gameMetadata: GameScoutingMetadata,
  resolved?: ResolvedOfficialProfile | null,
): ScoutingReport | null {
  const context =
    resolved ?? resolveOfficialProfile(officialId, gameMetadata.leagueId);
  if (!context) return null;

  const { profile, stats, qualified } = context;
  const leagueId = gameMetadata.leagueId;
  const taxonomyLeague: WhistleTaxonomyLeague | null = isWhistleTaxonomyLeague(
    leagueId,
  )
    ? leagueId
    : null;

  const crewGames = loadOfficialGames(officialId, leagueId);
  const sampleGames = crewGames.slice(-SCOUTING_REPORT_SAMPLE_WINDOW);

  if (!meetsSampleSizeThreshold(sampleGames.length)) {
    const analyticsFallback = buildAnalyticsFallbackReport(
      profile,
      gameMetadata,
      context,
      taxonomyLeague,
    );
    if (analyticsFallback) return analyticsFallback;
    return null;
  }

  let subjectiveTotal = 0;
  let administrativeTotal = 0;
  let eventBackedGames = 0;
  let baselineWhistleSum = 0;
  let pressureWhistleSum = 0;
  let pressureGameCount = 0;
  let baselineGameCount = 0;
  let pressureSubjectiveTotal = 0;
  let baselineSubjectiveTotal = 0;

  for (const game of sampleGames) {
    const whistleTotal = gameWhistleTotal(leagueId, game);
    baselineWhistleSum += whistleTotal;

    if (taxonomyLeague) {
      const counts = computeGameDispositionCounts(taxonomyLeague, game);
      subjectiveTotal += counts.subjective;
      administrativeTotal += counts.administrative;
      if (counts.eventBacked) eventBackedGames += 1;
    } else {
      const share = defaultSubjectiveShare(leagueId);
      subjectiveTotal += whistleTotal * share;
      administrativeTotal += whistleTotal * (1 - share);
    }

    const highStakes = isHighStakesGame(game, leagueId, gameMetadata);
    if (highStakes) {
      pressureWhistleSum += whistleTotal;
      pressureGameCount += 1;
      pressureSubjectiveTotal +=
        taxonomyLeague !== null
          ? computeGameDispositionCounts(taxonomyLeague, game).subjective
          : whistleTotal * defaultSubjectiveShare(leagueId);
    } else {
      baselineGameCount += 1;
      baselineSubjectiveTotal +=
        taxonomyLeague !== null
          ? computeGameDispositionCounts(taxonomyLeague, game).subjective
          : whistleTotal * defaultSubjectiveShare(leagueId);
    }
  }

  const whistleDenom = subjectiveTotal + administrativeTotal || 1;
  const subjectiveShare = subjectiveTotal / whistleDenom;
  const administrativeShare = administrativeTotal / whistleDenom;
  const styleProfile = deriveStyleProfile(subjectiveShare, administrativeShare);

  const baselineWhistlesPerGame = baselineWhistleSum / sampleGames.length;
  const pressureWhistlesPerGame =
    pressureGameCount > 0 ? pressureWhistleSum / pressureGameCount : null;

  let pressureDeltaPct: number | null = null;
  if (
    pressureWhistlesPerGame !== null &&
    baselineWhistlesPerGame > 0 &&
    pressureGameCount >= 3
  ) {
    pressureDeltaPct =
      (pressureWhistlesPerGame - baselineWhistlesPerGame) /
      baselineWhistlesPerGame;
  }

  const pressureSensitive =
    pressureDeltaPct !== null &&
    pressureDeltaPct >= PRESSURE_SENSITIVITY_THRESHOLD;

  let subjectiveDeltaPct: number | null = null;
  if (pressureGameCount >= 3 && baselineGameCount >= 3) {
    const pressureSubjectiveRate =
      pressureSubjectiveTotal / pressureGameCount;
    const baselineSubjectiveRate =
      baselineSubjectiveTotal / baselineGameCount;
    if (baselineSubjectiveRate > 0) {
      subjectiveDeltaPct =
        ((pressureSubjectiveRate - baselineSubjectiveRate) /
          baselineSubjectiveRate) *
        100;
    }
  }

  const summary = buildSummary(
    profile.name,
    styleProfile,
    pressureSensitive,
    pressureDeltaPct,
    gameMetadata,
    subjectiveDeltaPct,
  );

  const officialStats = resolveOfficialStats(
    leagueId,
    sampleGames,
    profile,
    subjectiveTotal,
    administrativeTotal,
    pressureSensitive,
    pressureDeltaPct,
  );

  const momentumLabel =
    officialStats.momentum_killer_label !== null &&
    officialStats.momentum_killer_label !== undefined
      ? MOMENTUM_KILLER_LABELS[officialStats.momentum_killer_label]
      : null;

  const insights = buildInsights(
    styleProfile,
    pressureSensitive,
    pressureDeltaPct,
    eventBackedGames,
    sampleGames.length,
    momentumLabel,
    officialStats.run_stoppage_rate ?? null,
  );

  const perGameWhistles = sampleGames.map((game) => gameWhistleTotal(leagueId, game));

  return {
    officialId: profile.slug,
    officialName: profile.name,
    leagueId,
    generatedAt: new Date().toISOString(),
    sampleGames: sampleGames.length,
    sampleWindow: SCOUTING_REPORT_SAMPLE_WINDOW,
    qualified,
    archetype: officialStats.primary_archetype,
    archetypeDisplayName: ARCHETYPE_DISPLAY_NAMES[officialStats.primary_archetype],
    archetypeBlurb: archetypeBlurbForStats(officialStats, perGameWhistles),
    consistencyScore: officialStats.consistency_score,
    officialStats,
    ...leverageReportFields(officialStats),
    styleProfile,
    pressureSensitive,
    pressureDeltaPct:
      pressureDeltaPct !== null ? round3(pressureDeltaPct) : null,
    baselineWhistlesPerGame: round1(baselineWhistlesPerGame),
    pressureWhistlesPerGame:
      pressureWhistlesPerGame !== null
        ? round1(pressureWhistlesPerGame)
        : null,
    summary,
    insights,
    eventBackedGames,
    runStoppageRate: officialStats.run_stoppage_rate ?? null,
    momentumKillerScore: officialStats.momentum_killer_score ?? null,
    momentumKillerLabel: momentumLabel,
    scoringRunBackedGames: officialStats.scoring_run_backed_games ?? 0,
  };
}
