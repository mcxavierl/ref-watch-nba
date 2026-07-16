import { getLeagueConfigEntry } from "@/config/leagueConfig";
import type { LeagueId } from "@/lib/leagues";

type LeagueNavId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

type LeagueLogoSet = {
  onDark: string;
  onLight: string;
};

const PRO_LEAGUE_LOGOS: Record<Exclude<LeagueNavId, "cbb" | "cfb">, LeagueLogoSet> = {
  nba: {
    onDark: "/logos/nba-logo.svg",
    onLight: "/logos/nba-logo-light.svg",
  },
  nhl: {
    onDark: "https://assets.nhle.com/logos/nhl/svg/NHL_light.svg",
    onLight: "https://assets.nhle.com/logos/nhl/svg/NHL_dark.svg",
  },
  nfl: {
    onDark: "/logos/nfl-shield.svg",
    onLight: "/logos/nfl-shield.svg",
  },
  epl: {
    onDark: "/logos/epl-lion.svg",
    onLight: "/logos/epl-lion-dark.svg",
  },
  laliga: {
    onDark: "/logos/laliga-white.png",
    onLight: "/logos/laliga-red.png",
  },
};

function leagueLogoForTheme(
  leagueId: LeagueId,
  colorMode: "light" | "dark",
): string | undefined {
  const entry = getLeagueConfigEntry(leagueId);
  if (!entry?.logos) return undefined;
  return colorMode === "light" ? entry.logos.light : entry.logos.dark;
}

/** Resolve themed league logo src for nav marks, hero badges, and chooser cards. */
export function leagueLogoSrc(
  league: LeagueId,
  colorMode: "light" | "dark",
): string | undefined {
  const registryLogo = leagueLogoForTheme(league, colorMode);
  if (registryLogo) return registryLogo;

  const proLogos = PRO_LEAGUE_LOGOS[league as Exclude<LeagueNavId, "cbb" | "cfb">];
  if (!proLogos) return undefined;
  return colorMode === "light" ? proLogos.onLight : proLogos.onDark;
}

export function leagueLogoNavClass(league: LeagueId): string {
  if (league === "cbb") return "league-nav-mark--cbb";
  if (league === "cfb") return "league-nav-mark--cfb";
  return `league-nav-mark--${league}`;
}
