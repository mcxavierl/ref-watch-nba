/** Parse NHL gamecenter play-by-play for minor penalties and OT. */

export interface NhlPenaltySummary {
  homeMinors: number;
  awayMinors: number;
  totalMinors: number;
  homePim: number;
  awayPim: number;
  totalPim: number;
}

interface PlayByPlayTeam {
  id: number;
}

interface PlayByPlayPlay {
  typeDescKey?: string;
  periodDescriptor?: { periodType?: string };
  details?: {
    typeCode?: string;
    eventOwnerTeamId?: number;
    committedByTeamId?: number;
    duration?: number;
  };
}

interface PlayByPlayResponse {
  homeTeam?: PlayByPlayTeam;
  awayTeam?: PlayByPlayTeam;
  plays?: PlayByPlayPlay[];
}

const MINOR_CODES = new Set(["MIN", "PS"]);

function penaltyTeamId(
  play: PlayByPlayPlay,
  homeId: number,
  awayId: number,
): number | null {
  const det = play.details;
  if (!det) return null;
  const teamId = det.committedByTeamId ?? det.eventOwnerTeamId;
  if (teamId === homeId || teamId === awayId) return teamId;
  return null;
}

function penaltyMinutes(play: PlayByPlayPlay): number {
  const duration = play.details?.duration;
  if (typeof duration === "number" && duration > 0) return duration;
  const code = play.details?.typeCode;
  if (code === "MAJ" || code === "MIS") return 5;
  return 2;
}

export function parsePlayByPlay(body: PlayByPlayResponse): NhlPenaltySummary & {
  wentToOvertime: boolean;
} {
  const homeId = body.homeTeam?.id;
  const awayId = body.awayTeam?.id;
  let homeMinors = 0;
  let awayMinors = 0;
  let homePim = 0;
  let awayPim = 0;
  let wentToOvertime = false;

  for (const play of body.plays ?? []) {
    if (play.periodDescriptor?.periodType === "OT") {
      wentToOvertime = true;
    }
    if (play.typeDescKey !== "penalty" || !homeId || !awayId) continue;

    const teamId = penaltyTeamId(play, homeId, awayId);
    if (!teamId) continue;

    const pim = penaltyMinutes(play);
    const code = play.details?.typeCode;
    const isMinor = !code || MINOR_CODES.has(code) || pim === 2;

    if (teamId === homeId) {
      homePim += pim;
      if (isMinor) homeMinors++;
    } else {
      awayPim += pim;
      if (isMinor) awayMinors++;
    }
  }

  return {
    homeMinors,
    awayMinors,
    totalMinors: homeMinors + awayMinors,
    homePim,
    awayPim,
    totalPim: homePim + awayPim,
    wentToOvertime,
  };
}

export async function fetchGamePenalties(
  gameId: number,
): Promise<(NhlPenaltySummary & { wentToOvertime: boolean }) | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(
        `https://api-web.nhle.com/v1/gamecenter/${gameId}/play-by-play`,
        {
          headers: {
            Accept: "application/json,text/plain,*/*",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://www.nhl.com/",
          },
        },
      );
      if (res.ok) {
        const body = (await res.json()) as PlayByPlayResponse;
        return parsePlayByPlay(body);
      }
      if (![429, 500, 502, 503, 504].includes(res.status)) return null;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }
  return null;
}

export function inferOvertimeFromSchedule(periodType?: string): boolean {
  return periodType === "OT" || periodType === "SO";
}
