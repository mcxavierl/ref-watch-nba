import { getLeagueConfigEntry } from "@/config/leagueConfig";
import type { LeagueId } from "@/lib/leagues";

type LeagueNavId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";

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
  wnba: {
    onDark: "/logos/wnba-logo.svg",
    onLight: "/logos/wnba-logo-light.svg",
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

  if (league === "cbb" || league === "cfb" || league === "mlb") return undefined;

  const proLogos = PRO_LEAGUE_LOGOS[league as keyof typeof PRO_LEAGUE_LOGOS];
  if (!proLogos) return undefined;
  return colorMode === "light" ? proLogos.onLight : proLogos.onDark;
}

export function leagueLogoNavClass(league: LeagueId): string {
  if (league === "cbb") return "league-nav-mark--cbb";
  if (league === "cfb") return "league-nav-mark--cfb";
  return `league-nav-mark--${league}`;
}

/** Intrinsic mark dimensions — must match each league logo's viewBox aspect ratio. */
export function leagueNavMarkDimensions(league: LeagueId): { width: number; height: number } {
  switch (league) {
    case "nfl":
      return { width: 13, height: 18 };
    case "cbb":
    case "cfb":
      return { width: 18, height: 18 };
    case "epl":
      // Portrait lion mark — must match epl-lion.svg viewBox (78 × 95).
      return { width: 22, height: 27 };
    case "laliga":
      return { width: 22, height: 18 };
    case "wnba":
      return { width: 16, height: 36 };
    case "nhl":
      return { width: 28, height: 18 };
    case "nba":
    default:
      return { width: 28, height: 18 };
  }
}

export function leagueHeroLogoDimensions(league: LeagueId): { width: number; height: number } {
  switch (league) {
    case "nfl":
    case "cfb":
      return { width: 36, height: 48 };
    case "epl":
      return { width: 56, height: 56 };
    case "laliga":
      return { width: 56, height: 40 };
    case "wnba":
      return { width: 36, height: 48 };
    case "nhl":
      return { width: 52, height: 40 };
    case "nba":
    default:
      return { width: 52, height: 40 };
  }
}
