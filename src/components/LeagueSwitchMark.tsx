import { LEAGUES, type LeagueId } from "@/lib/leagues";

type LeagueNavId = "nba" | "nhl" | "nfl" | "epl" | "laliga";

const LEAGUE_LOGOS: Record<
  LeagueNavId,
  { active: string; inactive: string; alt: string; className?: string }
> = {
  nba: {
    active: "https://cdn.nba.com/logos/leagues/logo-nba.svg",
    inactive: "https://cdn.nba.com/logos/leagues/logo-nba.svg",
    alt: "NBA",
    className: "league-nav-mark--nba",
  },
  nhl: {
    inactive: "https://assets.nhle.com/logos/nhl/svg/NHL_light.svg",
    active: "https://assets.nhle.com/logos/nhl/svg/NHL_dark.svg",
    alt: "NHL",
    className: "league-nav-mark--nhl",
  },
  nfl: {
    active: "/logos/nfl-shield.svg",
    inactive: "/logos/nfl-shield.svg",
    alt: "NFL",
    className: "league-nav-mark--nfl",
  },
  epl: {
    active: "/logos/epl-lion.svg",
    inactive: "/logos/epl-lion.svg",
    alt: "Premier League",
    className: "league-nav-mark--epl",
  },
  laliga: {
    active: "/logos/laliga.svg",
    inactive: "/logos/laliga.svg",
    alt: "La Liga",
    className: "league-nav-mark--laliga",
  },
};

type LeagueNavMarkProps = {
  league: LeagueId;
  active?: boolean;
};

export function LeagueNavMark({ league, active = false }: LeagueNavMarkProps) {
  const logos = LEAGUE_LOGOS[league as LeagueNavId];
  if (!logos) {
    return (
      <span className="league-nav-mark-fallback" aria-hidden>
        {LEAGUES[league].shortLabel}
      </span>
    );
  }

  const src = active ? logos.active : logos.inactive;

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`league-nav-mark${logos.className ? ` ${logos.className}` : ""}${active ? " league-nav-mark--on-pill" : ""}`}
      data-league={league}
      width={league === "nfl" ? 13 : 28}
      height={league === "nfl" ? 18 : 18}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

/** @deprecated Use LeagueNavMark */
export const LeagueSwitchMark = LeagueNavMark;

export type { LeagueNavId };

export function leagueNavLabel(league: LeagueId): string {
  return LEAGUES[league].label;
}

/** @deprecated Use leagueNavLabel */
export const leagueSwitchLabel = leagueNavLabel;
