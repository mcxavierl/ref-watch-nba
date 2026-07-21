import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { graphCacheKey, withGraphCache } from "@/lib/graph/cache";
import {
  getCachedLeagueKnowledgeGraph,
  graphCacheVersion,
  type RefWatchKnowledgeGraph,
} from "@/lib/graph/index";
import { queryOfficialFriction, type GraphQueryContext } from "@/lib/graph/queryEngine";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";

export type CrewPartnerSynergy = {
  partnerSlug: string;
  partnerName: string;
  sharedGames: number;
  combinedFoulVarianceDelta: number;
  avgFoulsCalled: number;
};

function countCoOfficials(
  graph: RefWatchKnowledgeGraph,
  officialId: string,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const { crewId } of graph.officialToCrews.get(officialId) ?? []) {
    const crew = graph.crews.get(crewId);
    if (!crew) continue;

    for (const memberSlug of crew.memberSlugs) {
      if (memberSlug === officialId) continue;
      counts.set(memberSlug, (counts.get(memberSlug) ?? 0) + (graph.crewToGames.get(crewId)?.length ?? 0));
    }
  }

  return counts;
}

export function queryTopCrewPartners(
  officialId: string,
  context: GraphQueryContext,
  limit = 3,
): CrewPartnerSynergy[] {
  if (!(PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(context.leagueId)) {
    return [];
  }

  const games = context.gameLogs;
  if (!games?.length) return [];

  const dataLeague = games[0]?.league as DataLeague;
  const lastUpdated = context.lastUpdated ?? "unknown";
  const version = graphCacheVersion(
    getCachedLeagueKnowledgeGraph(dataLeague, games, lastUpdated),
  );

  const cacheKey = graphCacheKey([
    "graph",
    "v1",
    "crew-partners",
    context.leagueId,
    version,
    officialId,
    String(limit),
  ]);

  return withGraphCache(cacheKey, () => {
    const graph = getCachedLeagueKnowledgeGraph(dataLeague, games, lastUpdated);
    const partnerCounts = countCoOfficials(graph, officialId);

    return [...partnerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([partnerSlug, sharedGames]) => {
        const partnerNode = graph.officials.get(partnerSlug);
        const friction = queryOfficialFriction(officialId, partnerSlug, context);

        return {
          partnerSlug,
          partnerName: partnerNode?.name ?? partnerSlug,
          sharedGames,
          combinedFoulVarianceDelta: friction?.foulVariance ?? 0,
          avgFoulsCalled: friction?.avgFoulsCalled ?? 0,
        };
      });
  });
}
