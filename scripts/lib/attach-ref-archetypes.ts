import {
  computeRefereeArchetype,
  officialStatsFromProfile,
  toOfficialStats,
  type ArchetypeGameInput,
} from "../../src/lib/analytics/referee-archetypes";
import {
  computeLeverageIndex,
  leverageFieldsFromResult,
} from "../../src/lib/analytics/leverage-sensitivity";
import {
  computeRawRunStoppageRate,
  finalizeMomentumKillerScores,
  isBasketballMomentumLeague,
  momentumFieldsFromResult,
  MOMENTUM_KILLER_METHOD_NOTE,
  type MomentumKillerGameInput,
} from "../../src/lib/analytics/momentum-killer-score";
import type { LeagueId } from "../../src/lib/leagues";
import { refSlug } from "../../src/lib/ref-slug";
import type { RefOfficial, RefProfile } from "../../src/lib/types";
import type { GameLogEntry } from "./game-logs";

function officialSlug(official: RefOfficial): string {
  return refSlug(official.name, official.number);
}

function toArchetypeInput(game: GameLogEntry): ArchetypeGameInput {
  return {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalFouls: game.totalFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    subjectiveFlags: (game as GameLogEntry & { subjectiveFlags?: number }).subjectiveFlags,
    administrativeFlags: (game as GameLogEntry & { administrativeFlags?: number })
      .administrativeFlags,
    penaltyEvents: game.penaltyEvents,
  };
}

function toLeverageInput(game: GameLogEntry) {
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
  };
}

function toMomentumInput(game: GameLogEntry): MomentumKillerGameInput {
  return {
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    scoringPlays: game.scoringPlays,
    crewStoppages: game.crewStoppages,
  };
}

export function attachRefArchetypesFromGames(
  profiles: RefProfile[],
  games: GameLogEntry[],
  leagueId: LeagueId,
): RefProfile[] {
  const gamesByOfficial = new Map<string, ArchetypeGameInput[]>();
  const leverageGamesByOfficial = new Map<
    string,
    ReturnType<typeof toLeverageInput>[]
  >();
  const momentumGamesByOfficial = new Map<string, MomentumKillerGameInput[]>();

  for (const game of games) {
    const input = toArchetypeInput(game);
    const leverageInput = toLeverageInput(game);
    const momentumInput = toMomentumInput(game);
    for (const official of game.officials) {
      const slug = officialSlug(official);
      const bucket = gamesByOfficial.get(slug) ?? [];
      bucket.push(input);
      gamesByOfficial.set(slug, bucket);

      const leverageBucket = leverageGamesByOfficial.get(slug) ?? [];
      leverageBucket.push(leverageInput);
      leverageGamesByOfficial.set(slug, leverageBucket);

      const momentumBucket = momentumGamesByOfficial.get(slug) ?? [];
      momentumBucket.push(momentumInput);
      momentumGamesByOfficial.set(slug, momentumBucket);
    }
  }

  const momentumRawBySlug = [...momentumGamesByOfficial.entries()].map(
    ([slug, momentumGames]) => {
      const raw = computeRawRunStoppageRate(momentumGames);
      return {
        slug,
        rawRate: raw.run_stoppage_rate,
        backedGames: raw.scoring_run_backed_games,
        runs: raw.opponent_scoring_runs,
        interruptions: raw.run_interruptions,
      };
    },
  );
  const momentumFinalized = isBasketballMomentumLeague(leagueId)
    ? finalizeMomentumKillerScores(momentumRawBySlug)
    : new Map();

  return profiles.map((profile) => {
    const officialGames = gamesByOfficial.get(profile.slug) ?? [];
    const archetype = computeRefereeArchetype(leagueId, officialGames);
    const leverageGames = leverageGamesByOfficial.get(profile.slug) ?? [];
    const leverage = computeLeverageIndex(leagueId, leverageGames);
    const momentumGames = momentumGamesByOfficial.get(profile.slug) ?? [];
    const momentumRaw = computeRawRunStoppageRate(momentumGames);
    const momentumFinal = momentumFinalized.get(profile.slug);

    if (!archetype && leverage.data_quality === "insufficient") return profile;

    const baseStats = archetype
      ? toOfficialStats(archetype)
      : officialStatsFromProfile(profile);
    if (!baseStats) return profile;

    return {
      ...profile,
      officialStats: {
        ...baseStats,
        ...leverageFieldsFromResult(leverage),
        ...momentumFieldsFromResult({
          run_stoppage_rate: momentumFinal?.run_stoppage_rate ?? momentumRaw.run_stoppage_rate,
          momentum_killer_score:
            momentumFinal?.momentum_killer_score ?? null,
          momentum_killer_label:
            momentumFinal?.momentum_killer_label ?? null,
          scoring_run_backed_games: momentumRaw.scoring_run_backed_games,
          opponent_scoring_runs: momentumRaw.opponent_scoring_runs,
          run_interruptions: momentumRaw.run_interruptions,
          momentum_method_note: MOMENTUM_KILLER_METHOD_NOTE,
          data_quality:
            momentumRaw.scoring_run_backed_games >= 15 &&
            (momentumRaw.opponent_scoring_runs ?? 0) >= 8
              ? "ok"
              : "insufficient",
        }),
      },
    };
  });
}
