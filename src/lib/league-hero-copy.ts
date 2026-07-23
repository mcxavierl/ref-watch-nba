import type { LeagueId } from "@/lib/leagues";

export type LeagueHeroCopy = {
  kicker: string;
  liveTitle: string;
  pendingTitle?: string;
  offseasonTitle: string;
  liveLead: string;
  pendingLead?: string;
  offseasonLead: string;
  statLabels: {
    officials: string;
    games: string;
    seasons: string;
  };
};

export const LEAGUE_HERO_COPY: Record<
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba",
  LeagueHeroCopy
> = {
  nba: {
    kicker: "NBA whistle desk",
    liveTitle: "Crew assignments and leverage-weighted whistle context.",
    offseasonTitle: "NBA refereeing stats, analyzed.",
    liveLead:
      "Crew assignments, foul tendencies, and ref×team history before tip-off, scored by sample depth.",
    offseasonLead:
      "Official profiles, foul rates, and ref×team histories across every indexed ref.",
    statLabels: {
      officials: "Refs indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  nhl: {
    kicker: "NHL whistle desk",
    liveTitle: "Penalty environment and crew leverage profiles.",
    offseasonTitle: "NHL refereeing stats, analyzed.",
    liveLead:
      "Crew assignments, minor-penalty rates, PP environment, and OT history before puck drop.",
    offseasonLead:
      "Official profiles, penalty rates, and team splits across every indexed official.",
    statLabels: {
      officials: "Officials indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  nfl: {
    kicker: "NFL whistle desk",
    liveTitle: "Crew context and high-leverage whistle variance.",
    pendingTitle: "Next NFL week is on the board.",
    offseasonTitle: "NFL refereeing stats, analyzed.",
    liveLead:
      "Crew assignments, penalty-yard tendencies, and official×team splits before kickoff.",
    pendingLead:
      "Matchups are scheduled; crew assignments publish closer to kickoff. Historical splits stay live below.",
    offseasonLead:
      "Crew profiles, flag rates, and official×team histories across every indexed crew.",
    statLabels: {
      officials: "Officials indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  epl: {
    kicker: "Premier League whistle desk",
    liveTitle: "Referee assignments and matchday whistle context.",
    pendingTitle: "Next matchday is on the board.",
    offseasonTitle: "Premier League refereeing stats, analyzed.",
    liveLead:
      "Referee assignments, foul and card tendencies, and ref×club history before kickoff.",
    pendingLead:
      "Fixtures are scheduled; referee appointments publish closer to kickoff. Historical splits stay live below.",
    offseasonLead:
      "Referee profiles, foul rates, and club splits across every indexed ref.",
    statLabels: {
      officials: "Refs indexed",
      games: "Matches logged",
      seasons: "Seasons",
    },
  },
  laliga: {
    kicker: "La Liga whistle desk",
    liveTitle: "Referee assignments and matchday whistle context.",
    pendingTitle: "Next matchday is on the board.",
    offseasonTitle: "La Liga refereeing stats, analyzed.",
    liveLead:
      "Referee assignments, foul and card tendencies, and ref×club history before kickoff.",
    pendingLead:
      "Fixtures are scheduled; referee appointments publish closer to kickoff. Historical splits stay live below.",
    offseasonLead:
      "Referee profiles, foul rates, and club splits across Spain's top flight.",
    statLabels: {
      officials: "Refs indexed",
      games: "Matches logged",
      seasons: "Seasons",
    },
  },
  cbb: {
    kicker: "CBB whistle desk",
    liveTitle: "Crew assignments and whistle context across D-I.",
    offseasonTitle: "College basketball refereeing stats, analyzed.",
    liveLead:
      "Referee assignments and whistle tendencies across D-I, with conference context on every team page.",
    offseasonLead:
      "Season opens soon. Ref profiles and tendencies load from game data. Team directory spans ACC, Big Ten, SEC, Big 12, and Big East.",
    statLabels: {
      officials: "Refs indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  cfb: {
    kicker: "CFB whistle desk",
    liveTitle: "Crew context and penalty variance this week.",
    offseasonTitle: "College football refereeing stats, analyzed.",
    liveLead:
      "Crew assignments, flag rates, and official×team splits before kickoff, with conference rivalries included.",
    offseasonLead:
      "Season opens soon. Crews and penalty tendencies load from game data. Team pages track Power Four and Group of Five programs.",
    statLabels: {
      officials: "Officials indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  wnba: {
    kicker: "WNBA whistle desk",
    liveTitle: "Tonight's whistle slate and betting edge context.",
    pendingTitle: "Upcoming WNBA games are on the board.",
    offseasonTitle: "WNBA refereeing stats, analyzed.",
    liveLead:
      "Upcoming matchups with whistle-pace context. Referee assignments publish closer to tipoff.",
    pendingLead:
      "Games are scheduled but referees have not been assigned yet. Matchup edges and historical pace context stay live below.",
    offseasonLead:
      "Live slate, matchup pace context, and referee insights from ESPN game logs.",
    statLabels: {
      officials: "Refs indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
};

export function leagueHeroCopy(leagueId: LeagueId): LeagueHeroCopy {
  return LEAGUE_HERO_COPY[leagueId as keyof typeof LEAGUE_HERO_COPY] ?? LEAGUE_HERO_COPY.nba;
}

type OfficiatingSurface = "court" | "rink" | "field";

const LEAGUE_OFFICIATING_SURFACE: Partial<Record<LeagueId, OfficiatingSurface>> = {
  nba: "court",
  wnba: "court",
  cbb: "court",
  nhl: "rink",
  nfl: "field",
  cfb: "field",
  epl: "field",
  laliga: "field",
};

/** League hub tagline: bias modeling for the third team on the right playing surface. */
export function leagueThirdTeamTagline(leagueId: LeagueId): string {
  const surface = LEAGUE_OFFICIATING_SURFACE[leagueId] ?? "field";
  return `Analytics and intelligence, bias modeling for the 3rd team on the ${surface}.`;
}
