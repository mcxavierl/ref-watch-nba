import {
  computeStarDeferenceIndex,
  starTreatmentFieldsFromResult,
  type StarDeferenceGameInput,
} from "../../src/lib/analytics/star-deference-index";
import type { LeagueId } from "../../src/lib/leagues";
import { loadPersonnelProfiles } from "../../src/lib/personnel-profiles";
import type { RefProfile } from "../../src/lib/types";
import type { GameLogEntry } from "./game-logs";

function toStarDeferenceInput(game: GameLogEntry): StarDeferenceGameInput {
  return {
    gameId: game.gameId,
    date: game.date,
    season: game.season,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    totalFouls: game.totalFouls,
    homeFouls: game.homeFouls,
    awayFouls: game.awayFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    officials: game.officials,
    personnel: game.personnel,
  };
}

export function attachStarDeferenceFromGames(
  profiles: RefProfile[],
  games: GameLogEntry[],
  leagueId: LeagueId,
): RefProfile[] {
  const personnel = loadPersonnelProfiles(leagueId);
  if (!personnel?.starPlayers.length) return profiles;

  const inputs = games.map(toStarDeferenceInput);

  return profiles.map((profile) => {
    const result = computeStarDeferenceIndex(
      leagueId,
      profile.slug,
      inputs,
      personnel.starPlayers,
    );

    if (result.data_quality === "insufficient") {
      return profile;
    }

    return {
      ...profile,
      starTreatmentAnalytics: starTreatmentFieldsFromResult(result),
    };
  });
}
