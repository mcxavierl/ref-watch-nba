import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, type LeagueId } from "@/lib/leagues";

export type OverviewSlateStatus = "live" | "scheduled";

export type OverviewSlateEntry = {
  leagueId: LeagueId;
  leagueLabel: string;
  leagueShortLabel: string;
  href: string;
  gameId: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  headRef?: string;
  crewCount: number;
  status: OverviewSlateStatus;
  slateDate?: string;
  slateStartAt?: string;
  matchupInsight?: string;
  lastMeetingLine?: string;
  /** Narrative H2H note for upcoming cards (recent meetings only). */
  gameContextLine?: string;
  teamContextLine?: string;
  officialsLine?: string;
  metadataLine?: string;
  seasonStageNote?: string;
  preview?: GameSlatePreviewPayload;
  /** Top ref-preview insights for compact upcoming cards when crew is assigned. */
  previewCardInsights?: string[];
};

export type OverviewLeagueNote = {
  leagueId: LeagueId;
  leagueShortLabel: string;
  note: string;
  slateDate?: string;
};

export type OverviewLeagueSlateGroup = {
  leagueId: LeagueId;
  leagueLabel: string;
  leagueShortLabel: string;
  href: string;
  liveCount: number;
  scheduledCount: number;
  games: OverviewSlateEntry[];
};

export type OverviewUpcomingSlate = {
  inSeason: boolean;
  hasLiveCrews: boolean;
  totalGames: number;
  totalScheduled: number;
  lastUpdated: string | null;
  games: OverviewSlateEntry[];
  leagueGroups: OverviewLeagueSlateGroup[];
  leagueNotes: OverviewLeagueNote[];
};

export function formatLeagueSlateCounts(liveCount: number, scheduledCount: number): string {
  const parts: string[] = [];
  if (liveCount > 0) {
    parts.push(`${liveCount} live`);
  }
  if (scheduledCount > 0) {
    parts.push(`${scheduledCount} scheduled`);
  }
  return parts.join(" · ");
}

function slateChronologyMs(entry: OverviewSlateEntry): number {
  if (entry.slateStartAt) {
    const parsed = Date.parse(entry.slateStartAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (entry.slateDate) {
    const parsed = Date.parse(`${entry.slateDate}T12:00:00`);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Live first, then soonest start time, then matchup label. */
export function compareSlateChronology(
  a: OverviewSlateEntry,
  b: OverviewSlateEntry,
): number {
  const liveDelta = (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1);
  if (liveDelta !== 0) return liveDelta;
  const timeDelta = slateChronologyMs(a) - slateChronologyMs(b);
  if (timeDelta !== 0) return timeDelta;
  return a.matchup.localeCompare(b.matchup);
}

export function sortSlateChronology(games: OverviewSlateEntry[]): OverviewSlateEntry[] {
  return [...games].sort(compareSlateChronology);
}

function leagueSortOrder(): Map<LeagueId, number> {
  return new Map<LeagueId, number>(
    activeLiveLeagueIds().map((id, index) => [id, index]),
  );
}

/** Group slate entries by league, preserving live-first ordering within each group. */
export function groupOverviewSlateByLeague(games: OverviewSlateEntry[]): OverviewLeagueSlateGroup[] {
  const order = leagueSortOrder();
  const byLeague = new Map<LeagueId, OverviewSlateEntry[]>();

  for (const game of games) {
    const list = byLeague.get(game.leagueId) ?? [];
    list.push(game);
    byLeague.set(game.leagueId, list);
  }

  return [...byLeague.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
    .map(([leagueId, leagueGames]) => {
      const league = LEAGUES[leagueId];
      const liveCount = leagueGames.filter((game) => game.status === "live").length;
      const scheduledCount = leagueGames.filter((game) => game.status === "scheduled").length;
      const sortedGames = sortSlateChronology(leagueGames);

      return {
        leagueId,
        leagueLabel: league.label,
        leagueShortLabel: league.shortLabel,
        href: leagueHubHref(leagueId),
        liveCount,
        scheduledCount,
        games: sortedGames,
      };
    });
}
