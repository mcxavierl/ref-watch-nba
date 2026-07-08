type LeagueSwitchId = "nba" | "nhl" | "nfl";

const LEAGUE_LOGOS: Record<
  LeagueSwitchId,
  { active: string; inactive: string; alt: string }
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
  },
};

type LeagueSwitchMarkProps = {
  league: keyof typeof LEAGUE_LOGOS;
  active?: boolean;
};

export function LeagueSwitchMark({ league, active = false }: LeagueSwitchMarkProps) {
  const logos = LEAGUE_LOGOS[league];
  const src = active ? logos.active : logos.inactive;

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className="league-switch-mark"
      width={28}
      height={18}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

export type { LeagueSwitchId };

export function leagueSwitchLabel(league: LeagueSwitchId): string {
  return LEAGUE_LOGOS[league].alt;
}
