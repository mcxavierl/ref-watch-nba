import { crewKey } from "@/lib/data";
import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { refSlug } from "@/lib/ref-slug";
import { withGraphCache } from "@/lib/graph/cache";
import type {
  CrewNode,
  FeaturedTeamEdge,
  GameNode,
  OfficiatedEdge,
  OfficiatedTeamEdge,
  OfficialNode,
  PartOfCrewEdge,
  TeamNode,
  VenueNode,
} from "@/lib/graph/schema";
import { venueIdForHomeTeam } from "@/lib/graph/schema";

export interface RefWatchKnowledgeGraph {
  officials: Map<string, OfficialNode>;
  crews: Map<string, CrewNode>;
  games: Map<string, GameNode>;
  teams: Map<string, TeamNode>;
  venues: Map<string, VenueNode>;
  officialToCrews: Map<string, Array<{ crewId: string; edge: PartOfCrewEdge }>>;
  crewToGames: Map<string, Array<{ gameId: string; edge: OfficiatedEdge }>>;
  gameToTeams: Map<string, Array<{ teamId: string; edge: FeaturedTeamEdge }>>;
  officialToTeams: Map<string, Array<{ teamId: string; edge: OfficiatedTeamEdge }>>;
  /** Official slug -> sorted game dates for rest-day lookups. */
  officialGameDates: Map<string, string[]>;
  meta: {
    league: DataLeague;
    lastUpdated: string;
    gameCount: number;
  };
}

type OfficialAccumulator = {
  node: OfficialNode;
  totalGames: number;
  totalFouls: number;
  crewGames: Map<string, { games: number; foulSum: number }>;
  teamStats: Map<
    string,
    {
      games: number;
      wins: number;
      foulSum: number;
      leagueFoulAvg: number;
    }
  >;
};

function teamWon(game: RuntimeGameLogEntry, teamAbbr: string): boolean {
  const abbr = teamAbbr.toUpperCase();
  if (game.homeTeam.toUpperCase() === abbr) {
    return game.homeScore > game.awayScore;
  }
  if (game.awayTeam.toUpperCase() === abbr) {
    return game.awayScore > game.homeScore;
  }
  return false;
}

function leagueAvgFouls(games: RuntimeGameLogEntry[]): number {
  if (games.length === 0) return 0;
  return games.reduce((sum, game) => sum + game.totalFouls, 0) / games.length;
}

export function buildLeagueKnowledgeGraph(
  league: DataLeague,
  games: RuntimeGameLogEntry[],
  lastUpdated = "unknown",
): RefWatchKnowledgeGraph {
  const graph: RefWatchKnowledgeGraph = {
    officials: new Map(),
    crews: new Map(),
    games: new Map(),
    teams: new Map(),
    venues: new Map(),
    officialToCrews: new Map(),
    crewToGames: new Map(),
    gameToTeams: new Map(),
    officialToTeams: new Map(),
    officialGameDates: new Map(),
    meta: {
      league,
      lastUpdated,
      gameCount: games.length,
    },
  };

  const leagueFoulBaseline = leagueAvgFouls(games);
  const officialAccum = new Map<string, OfficialAccumulator>();

  for (const game of games) {
    const venueId = venueIdForHomeTeam(league, game.homeTeam);
    const gameNode: GameNode = {
      id: game.gameId,
      kind: "Game",
      date: game.date,
      season: game.season,
      league,
      homeTeam: game.homeTeam.toUpperCase(),
      awayTeam: game.awayTeam.toUpperCase(),
      totalPoints: game.totalPoints,
      totalFouls: game.totalFouls,
      venueId,
    };
    graph.games.set(game.gameId, gameNode);

    const venueNode: VenueNode = {
      id: venueId,
      kind: "Venue",
      homeTeam: game.homeTeam.toUpperCase(),
      league,
    };
    graph.venues.set(venueId, venueNode);

    for (const abbr of [game.homeTeam, game.awayTeam]) {
      const teamId = abbr.toUpperCase();
      if (!graph.teams.has(teamId)) {
        graph.teams.set(teamId, { id: teamId, kind: "Team", abbr: teamId });
      }
    }

    const featured: Array<{ teamId: string; edge: FeaturedTeamEdge }> = [
      {
        teamId: game.homeTeam.toUpperCase(),
        edge: { type: "FEATURED_TEAM", isHome: true },
      },
      {
        teamId: game.awayTeam.toUpperCase(),
        edge: { type: "FEATURED_TEAM", isHome: false },
      },
    ];
    graph.gameToTeams.set(game.gameId, featured);

    if (game.officials.length === 0) continue;

    const crewId = crewKey(game.officials);
    const memberSlugs = game.officials
      .map((official) => refSlug(official.name, official.number))
      .sort();

    if (!graph.crews.has(crewId)) {
      graph.crews.set(crewId, { id: crewId, kind: "Crew", memberSlugs });
    }

    const officiatedEdge: OfficiatedEdge = {
      type: "OFFICIATED",
      date: game.date,
      foulsCalled: game.totalFouls,
      totalPoints: game.totalPoints,
    };
    const crewGames = graph.crewToGames.get(crewId) ?? [];
    crewGames.push({ gameId: game.gameId, edge: officiatedEdge });
    graph.crewToGames.set(crewId, crewGames);

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      let acc = officialAccum.get(slug);
      if (!acc) {
        acc = {
          node: {
            id: slug,
            kind: "Official",
            name: official.name,
            number: official.number,
          },
          totalGames: 0,
          totalFouls: 0,
          crewGames: new Map(),
          teamStats: new Map(),
        };
        officialAccum.set(slug, acc);
      }

      acc.totalGames += 1;
      acc.totalFouls += game.totalFouls;

      const crewBucket = acc.crewGames.get(crewId) ?? { games: 0, foulSum: 0 };
      crewBucket.games += 1;
      crewBucket.foulSum += game.totalFouls;
      acc.crewGames.set(crewId, crewBucket);

      const dates = graph.officialGameDates.get(slug) ?? [];
      dates.push(game.date);
      graph.officialGameDates.set(slug, dates);

      for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
        const teamId = teamAbbr.toUpperCase();
        const bucket = acc.teamStats.get(teamId) ?? {
          games: 0,
          wins: 0,
          foulSum: 0,
          leagueFoulAvg: leagueFoulBaseline,
        };
        bucket.games += 1;
        bucket.wins += teamWon(game, teamId) ? 1 : 0;
        bucket.foulSum += game.totalFouls;
        acc.teamStats.set(teamId, bucket);
      }
    }
  }

  for (const [slug, acc] of officialAccum) {
    graph.officials.set(slug, acc.node);
    const avgFouls = acc.totalGames > 0 ? acc.totalFouls / acc.totalGames : 0;

    const crewEdges: Array<{ crewId: string; edge: PartOfCrewEdge }> = [];
    for (const [crewId, bucket] of acc.crewGames) {
      const crewAvgFouls = bucket.games > 0 ? bucket.foulSum / bucket.games : 0;
      crewEdges.push({
        crewId,
        edge: {
          type: "PART_OF_CREW",
          frequency: acc.totalGames > 0 ? bucket.games / acc.totalGames : 0,
          frictionDelta: crewAvgFouls - avgFouls,
        },
      });
    }
    graph.officialToCrews.set(slug, crewEdges);

    const teamEdges: Array<{ teamId: string; edge: OfficiatedTeamEdge }> = [];
    for (const [teamId, bucket] of acc.teamStats) {
      const avgGameFouls = bucket.games > 0 ? bucket.foulSum / bucket.games : 0;
      teamEdges.push({
        teamId,
        edge: {
          type: "OFFICIATED_TEAM",
          gamesSample: bucket.games,
          winRate: bucket.games > 0 ? bucket.wins / bucket.games : 0,
          foulDelta: avgGameFouls - bucket.leagueFoulAvg,
        },
      });
    }
    graph.officialToTeams.set(slug, teamEdges);

    const sortedDates = graph.officialGameDates.get(slug);
    if (sortedDates) {
      sortedDates.sort();
      graph.officialGameDates.set(slug, sortedDates);
    }
  }

  return graph;
}

export function graphCacheVersion(graph: RefWatchKnowledgeGraph): string {
  return `${graph.meta.league}:${graph.meta.lastUpdated}:${graph.meta.gameCount}`;
}

export function getCachedLeagueKnowledgeGraph(
  league: DataLeague,
  games: RuntimeGameLogEntry[],
  lastUpdated: string,
): RefWatchKnowledgeGraph {
  const versionKey = `${league}:${lastUpdated}:${games.length}`;
  return withGraphCache(`graph:index:v1:${versionKey}`, () =>
    buildLeagueKnowledgeGraph(league, games, lastUpdated),
  );
}
