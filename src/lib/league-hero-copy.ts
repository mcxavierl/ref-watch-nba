import type { LeagueId } from "@/lib/leagues";

export type LeagueHeroCopy = {
  kicker: string;
  liveTitle: string;
  offseasonTitle: string;
  liveLead: string;
  offseasonLead: string;
  statLabels: {
    officials: string;
    games: string;
    seasons: string;
  };
};

export const LEAGUE_HERO_COPY: Record<
  "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb",
  LeagueHeroCopy
> = {
  nba: {
    kicker: "NBA officiating intelligence",
    liveTitle: "Who's blowing the whistle tonight.",
    offseasonTitle: "Decode officiating bias. Spot the historical edges.",
    liveLead:
      "Crew assignments, foul tendencies, and ref×team history before tip-off, scored by sample depth, not hype.",
    offseasonLead:
      "Deep analytics across every indexed official, ref×team matrices, and multi-season whistle splits. The full toolkit runs on historical data while the slate rests.",
    statLabels: {
      officials: "Refs indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  nhl: {
    kicker: "NHL penalty desk",
    liveTitle: "Who's putting them in the box tonight.",
    offseasonTitle: "NHL officiating on file.",
    liveLead:
      "Crew assignments, minor-penalty rates, PP environment, and OT history before puck drop.",
    offseasonLead:
      "Official profiles, penalty tendencies, and team splits while the schedule pauses.",
    statLabels: {
      officials: "Officials indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  nfl: {
    kicker: "NFL flag desk",
    liveTitle: "Who's throwing flags this week.",
    offseasonTitle: "NFL officiating on file.",
    liveLead:
      "Crew assignments, penalty-yard tendencies, and official×team splits before kickoff.",
    offseasonLead:
      "Official profiles, flag rates, and team histories while the week resets.",
    statLabels: {
      officials: "Officials indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  epl: {
    kicker: "Premier League whistle desk",
    liveTitle: "Who's officiating the matchday.",
    offseasonTitle: "Premier League officiating on file.",
    liveLead:
      "Referee assignments, foul and card tendencies, and ref×club history before kickoff.",
    offseasonLead:
      "Referee profiles, foul rates, and club splits while the schedule pauses.",
    statLabels: {
      officials: "Refs indexed",
      games: "Matches logged",
      seasons: "Seasons",
    },
  },
  cbb: {
    kicker: "Men's college hoops",
    liveTitle: "Who's calling fouls on campus tonight.",
    offseasonTitle: "College basketball crews, season opens soon.",
    liveLead:
      "Crew assignments and whistle tendencies across D-I, with conference context on every team page.",
    offseasonLead:
      "Season opens soon. Crews and tendencies load from game data. Team directory spans ACC, Big Ten, SEC, Big 12, and Big East.",
    statLabels: {
      officials: "Refs indexed",
      games: "Games logged",
      seasons: "Seasons",
    },
  },
  cfb: {
    kicker: "College football",
    liveTitle: "Who's marking off Saturday.",
    offseasonTitle: "College football officials, kickoff pending.",
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
};

export function leagueHeroCopy(leagueId: LeagueId): LeagueHeroCopy {
  if (leagueId in LEAGUE_HERO_COPY) {
    return LEAGUE_HERO_COPY[leagueId as keyof typeof LEAGUE_HERO_COPY];
  }
  return LEAGUE_HERO_COPY.nba;
}
