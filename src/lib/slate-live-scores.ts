import type { LeagueId } from "@/lib/leagues";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  espnScoreboardUrl,
  formatSlateGameClock,
  resolveSlateGamePhase,
  toYyyymmdd,
  torontoIsoDate,
  type SlateLiveScore,
} from "@/lib/slate-game-phase";

type EspnScoreboardResponse = {
  events?: {
    id: string;
    status?: {
      type?: { name?: string };
      displayClock?: string;
      period?: number;
    };
    competitions?: {
      status?: {
        type?: { name?: string };
        displayClock?: string;
        period?: number;
      };
      competitors?: {
        homeAway: string;
        score?: string;
        team?: { abbreviation?: string };
      }[];
    }[];
  }[];
};

type SlateScoreRequest = {
  leagueId: LeagueId;
  gameId: string;
  slateDate?: string;
};

function parseScore(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function periodLabel(leagueId: LeagueId, period: number | undefined): string | undefined {
  if (!period) return undefined;
  if (leagueId === "nba" || leagueId === "wnba") {
    return period <= 4 ? `Q${period}` : `OT${period - 4}`;
  }
  if (leagueId === "nfl") {
    return period <= 4 ? `Q${period}` : `OT`;
  }
  return `P${period}`;
}

export function parseEspnScoreboardEvents(
  leagueId: LeagueId,
  body: EspnScoreboardResponse,
): SlateLiveScore[] {
  const scores: SlateLiveScore[] = [];

  for (const event of body.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    let awayScore: number | undefined;
    let homeScore: number | undefined;
    for (const team of comp.competitors ?? []) {
      const score = parseScore(team.score);
      if (team.homeAway === "home") homeScore = score;
      else awayScore = score;
    }

    const status =
      comp.status?.type?.name ?? event.status?.type?.name ?? "STATUS_SCHEDULED";
    const gamePhase = resolveSlateGamePhase(status);
    const clock = formatSlateGameClock(
      status,
      comp.status?.displayClock ?? event.status?.displayClock,
      periodLabel(leagueId, comp.status?.period ?? event.status?.period),
    );

    scores.push({
      leagueId,
      gameId: event.id,
      awayScore: awayScore ?? 0,
      homeScore: homeScore ?? 0,
      gameStatus: status,
      gamePhase,
      gameClock: clock,
      gamePeriod: periodLabel(leagueId, comp.status?.period ?? event.status?.period),
    });
  }

  return scores;
}

export async function fetchEspnSlateScoresForLeague(
  leagueId: LeagueId,
  yyyymmdd: string,
): Promise<SlateLiveScore[]> {
  const url = espnScoreboardUrl(leagueId, yyyymmdd);
  if (!url) return [];

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`ESPN scoreboard ${leagueId} ${yyyymmdd}: ${res.status}`);
  }

  const body = (await res.json()) as EspnScoreboardResponse;
  return parseEspnScoreboardEvents(leagueId, body);
}

export function collectSlateScoreRequests(
  games: OverviewSlateEntry[],
): SlateScoreRequest[] {
  const requests: SlateScoreRequest[] = [];
  const seen = new Set<string>();

  for (const game of games) {
    const key = `${game.leagueId}:${game.gameId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    requests.push({
      leagueId: game.leagueId,
      gameId: game.gameId,
      slateDate: game.slateDate,
    });
  }

  return requests;
}

export async function fetchSlateLiveScores(
  games: OverviewSlateEntry[],
): Promise<SlateLiveScore[]> {
  const requests = collectSlateScoreRequests(games);
  const datesByLeague = new Map<LeagueId, Set<string>>();

  for (const request of requests) {
    const dates = datesByLeague.get(request.leagueId) ?? new Set<string>();
    dates.add(toYyyymmdd(request.slateDate ?? torontoIsoDate()));
    dates.add(toYyyymmdd(torontoIsoDate()));
    datesByLeague.set(request.leagueId, dates);
  }

  const byGameId = new Map<string, SlateLiveScore>();

  for (const [leagueId, dates] of datesByLeague) {
    for (const yyyymmdd of dates) {
      try {
        const scores = await fetchEspnSlateScoresForLeague(leagueId, yyyymmdd);
        for (const score of scores) {
          byGameId.set(`${score.leagueId}:${score.gameId}`, score);
        }
      } catch {
        /* skip failed scoreboard fetches */
      }
    }
  }

  return requests
    .map((request) => byGameId.get(`${request.leagueId}:${request.gameId}`))
    .filter((score): score is SlateLiveScore => score !== undefined);
}

export function mergeSlateLiveScores(
  games: OverviewSlateEntry[],
  scores: SlateLiveScore[],
): OverviewSlateEntry[] {
  if (scores.length === 0) return games;

  const scoreByKey = new Map(
    scores.map((score) => [`${score.leagueId}:${score.gameId}`, score]),
  );

  return games.map((game) => {
    const live = scoreByKey.get(`${game.leagueId}:${game.gameId}`);
    if (!live) return game;

    const status =
      live.gamePhase === "live"
        ? "live"
        : live.gamePhase === "final"
          ? "final"
          : game.status;

    return {
      ...game,
      status,
      gamePhase: live.gamePhase,
      awayScore: live.awayScore,
      homeScore: live.homeScore,
      gameStatus: live.gameStatus,
      gameClock: live.gameClock,
      gamePeriod: live.gamePeriod,
    };
  });
}
