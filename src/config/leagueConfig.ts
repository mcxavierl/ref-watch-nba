import type { LeagueId } from "@/lib/leagues";

export type LeagueThemeLogos = {
  light: string;
  dark: string;
};

export type LeagueRegistryEntry = {
  id: LeagueId;
  name: string;
  slug: string;
  seasonStartMonth: number;
  seasonStartDay: number;
  themeColor?: string;
  logos?: LeagueThemeLogos;
  /** Manual NCAA integrity gate — analytics locked until true and pipeline passes. */
  dataVerified?: boolean;
};

/**
 * Canonical league registry for season metadata, branding, and dashboard headers.
 * Season-start dates reflect the next scheduled regular-season open (2026 cycle).
 */
export const LEAGUE_CONFIG: Partial<Record<LeagueId, LeagueRegistryEntry>> = {
  nba: {
    id: "nba",
    name: "NBA",
    slug: "nba",
    seasonStartMonth: 10,
    seasonStartDay: 22,
  },
  nhl: {
    id: "nhl",
    name: "NHL",
    slug: "nhl",
    seasonStartMonth: 10,
    seasonStartDay: 6,
  },
  nfl: {
    id: "nfl",
    name: "NFL",
    slug: "nfl",
    seasonStartMonth: 9,
    seasonStartDay: 9,
  },
  epl: {
    id: "epl",
    name: "Premier League",
    slug: "epl",
    seasonStartMonth: 8,
    seasonStartDay: 21,
  },
  laliga: {
    id: "laliga",
    name: "La Liga",
    slug: "laliga",
    seasonStartMonth: 8,
    seasonStartDay: 14,
  },
  cbb: {
    id: "cbb",
    name: "NCAA Basketball",
    slug: "cbb",
    seasonStartMonth: 11,
    seasonStartDay: 4,
    themeColor: "#009CDE",
    logos: {
      light: "/assets/logos/ncaa.svg",
      dark: "/assets/logos/ncaa.svg",
    },
    dataVerified: true,
  },
  cfb: {
    id: "cfb",
    name: "NCAA Football",
    slug: "cfb",
    seasonStartMonth: 8,
    seasonStartDay: 29,
    themeColor: "#009CDE",
    logos: {
      light: "/assets/logos/ncaa.svg",
      dark: "/assets/logos/ncaa.svg",
    },
    dataVerified: true,
  },
};

export function getLeagueConfigEntry(
  leagueId: LeagueId,
): LeagueRegistryEntry | undefined {
  return LEAGUE_CONFIG[leagueId];
}

/** Format season start as MM/DD for dashboard badges (fixed width, no layout shift). */
export function formatLeagueSeasonStart(leagueId: LeagueId): string | undefined {
  const entry = getLeagueConfigEntry(leagueId);
  if (!entry) return undefined;
  const month = String(entry.seasonStartMonth).padStart(2, "0");
  const day = String(entry.seasonStartDay).padStart(2, "0");
  return `${month}/${day}`;
}
