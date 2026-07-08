import { LEAGUES, type LeagueId } from "@/lib/leagues";

type LeagueNavId = "nba" | "nhl" | "nfl" | "epl";

const LEAGUE_LOGOS: Record<
  LeagueNavId,
  { active: string; inactive: string; alt: string; className?: string }
> = {
  nba: {
    active: "https://cdn.nba.com/logos/leagues/logo-nba.svg",
    inactive: "https://cdn.nba.com/logos/leagues/logo-nba.svg",
    alt: "NBA",
  },
  nhl: {
    inactive: "https://assets.nhle.com/logos/nhl/svg/NHL_light.svg",
    active: "https://assets.nhle.com/logos/nhl/svg/NHL_dark.svg",
    alt: "NHL",
  },
  nfl: {
    active:
      "https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg",
    inactive:
      "https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg",
    alt: "NFL",
    className: "league-nav-mark--nfl",
  },
  epl: {
    active:
      "https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg",
    inactive:
      "https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg",
    alt: "Premier League",
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
      className={`league-nav-mark${logos.className ? ` ${logos.className}` : ""}`}
      width={28}
      height={18}
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
