import { loadRuntimeGameLogs } from "@/lib/game-logs";
import { getCachedGameLogs, type DataLeague, type RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { isSlateLeagueId, loadLeagueSlateBundle } from "@/lib/league-slate-data";
import { leagueHref, type LeagueId } from "@/lib/leagues";
import { leagueSlateHubPath } from "@/lib/seo";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { refSlug } from "@/lib/ref-slug";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefProfile } from "@/lib/types";

const LEAGUE_TO_DATA: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "WNBA",
};

export type PairedCrewMember = {
  name: string;
  slug: string;
  sharedGames: number;
  href: string;
};

export type SimilarWhistleProfile = {
  name: string;
  slug: string;
  overRate: number;
  foulsDelta: number;
  summary: string;
  href: string;
};

export type RefUpcomingGame = {
  gameId: string;
  matchup: string;
  slateDate?: string;
  href: string;
};

export type RefProfileDiscovery = {
  pairedCrewMembers: PairedCrewMember[];
  similarProfiles: SimilarWhistleProfile[];
  upcomingGames: RefUpcomingGame[];
};

function findPairedCrewMembersFromLogs(
  leagueId: LeagueId,
  targetSlug: string,
  games: RuntimeGameLogEntry[],
): PairedCrewMember[] {
  const counts = new Map<string, { name: string; slug: string; games: number }>();

  for (const game of games) {
    const slugs = game.officials.map((official) =>
      refSlug(official.name, official.number),
    );
    if (!slugs.includes(targetSlug)) continue;

    for (let index = 0; index < game.officials.length; index += 1) {
      const official = game.officials[index];
      const slug = slugs[index];
      if (slug === targetSlug) continue;

      const existing = counts.get(slug);
      if (existing) {
        existing.games += 1;
      } else {
        counts.set(slug, { name: official.name, slug, games: 1 });
      }
    }
  }

  return [...counts.values()]
    .sort((left, right) => right.games - left.games)
    .slice(0, 5)
    .map((entry) => ({
      name: entry.name,
      slug: entry.slug,
      sharedGames: entry.games,
      href: leagueHref(leagueId, `/refs/${entry.slug}`),
    }));
}

function findPairedCrewMembers(
  leagueId: LeagueId,
  targetSlug: string,
): PairedCrewMember[] {
  const dataLeague = LEAGUE_TO_DATA[leagueId];
  if (!dataLeague) return [];

  const games =
    loadRuntimeGameLogs(dataLeague)?.games ??
    getCachedGameLogs(dataLeague)?.games ??
    null;
  if (!games?.length) return [];

  return findPairedCrewMembersFromLogs(leagueId, targetSlug, games);
}

function similarProfileSummary(
  overDistance: number,
  foulDistance: number,
): string {
  const parts: string[] = [];
  if (overDistance <= 0.03) parts.push("similar over rate");
  if (foulDistance <= 1.5) parts.push("similar whistle tendency");
  return parts.length > 0
    ? parts.join(" · ")
    : "Comparable scoring and whistle profile";
}

function findSimilarWhistleProfiles(
  leagueId: LeagueId,
  profile: RefProfile,
  minSample: number,
): SimilarWhistleProfile[] {
  const { stats } = loadLeagueStats(leagueId);

  return stats.refs
    .filter(
      (ref) =>
        ref.slug !== profile.slug &&
        ref.games >= minSample,
    )
    .map((ref) => {
      const overDistance = Math.abs(ref.overRate - profile.overRate);
      const foulDistance = Math.abs(ref.foulsDelta - profile.foulsDelta);
      return {
        ref,
        score: overDistance + foulDistance * 0.05,
        overDistance,
        foulDistance,
      };
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map(({ ref, overDistance, foulDistance }) => ({
      name: ref.name,
      slug: ref.slug,
      overRate: ref.overRate,
      foulsDelta: ref.foulsDelta,
      summary: similarProfileSummary(overDistance, foulDistance),
      href: leagueHref(leagueId, `/refs/${ref.slug}`),
    }));
}

function findUpcomingGames(
  leagueId: LeagueId,
  targetSlug: string,
): RefUpcomingGame[] {
  if (!isSlateLeagueId(leagueId)) return [];

  const { assignments } = loadLeagueSlateBundle(leagueId);
  const allGames = [
    ...assignments.games,
    ...(assignments.scheduledGames ?? []),
  ];
  const hubPath = leagueSlateHubPath(leagueId);

  return allGames
    .filter((game) =>
      game.crew.some(
        (official) => refSlug(official.name, official.number) === targetSlug,
      ),
    )
    .slice(0, 5)
    .map((game) => ({
      gameId: game.id,
      matchup: game.matchup,
      slateDate: game.slateDate ?? assignments.date,
      href: `${hubPath}#game-${game.id}`,
    }));
}

export function buildRefProfileDiscovery(
  leagueId: LeagueId,
  profile: RefProfile,
): RefProfileDiscovery {
  const { stats } = loadLeagueStats(leagueId);

  return {
    pairedCrewMembers: findPairedCrewMembers(leagueId, profile.slug),
    similarProfiles: findSimilarWhistleProfiles(
      leagueId,
      profile,
      stats.meta.minSampleSize,
    ),
    upcomingGames: findUpcomingGames(leagueId, profile.slug),
  };
}

export { findPairedCrewMembersFromLogs };

export function formatSimilarProfileMetrics(profile: SimilarWhistleProfile): string {
  return `${formatPct(profile.overRate)} over · ${formatSigned(profile.foulsDelta)} whistle`;
}
