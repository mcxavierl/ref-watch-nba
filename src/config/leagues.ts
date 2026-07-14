import type { LeagueId } from "@/lib/leagues";
import { isVerifiedLiveLeague } from "@/lib/league-verification";
import { resolveNcaaDataVerifiedForLeagueId } from "@/lib/ncaa-pipeline";
import type { RefStatsFile } from "@/lib/types";

export type LeagueThemeLogos = {
  /** Logo for light backgrounds (higher contrast mark). */
  light: string;
  /** Logo for dark backgrounds (knockout / white mark). */
  dark: string;
};

export type LeagueRegistryEntry = {
  id: LeagueId;
  name: string;
  slug: string;
  startDate: string;
  themeColor: string;
  logos: LeagueThemeLogos;
  /** When false, league cards must not render on the overview hub. */
  dataVerified: boolean;
};

export const CFB_LEAGUE_ENTRY = {
  id: "cfb",
  name: "NCAA Football",
  slug: "cfb",
  startDate: "Aug 29",
  themeColor: "#009CDE",
  logos: {
    light: "/assets/logos/ncaa-blue.svg",
    dark: "/assets/logos/ncaa-white.svg",
  },
  dataVerified: false,
} as const satisfies LeagueRegistryEntry;

export const CBB_LEAGUE_ENTRY = {
  id: "cbb",
  name: "NCAA Basketball",
  slug: "cbb",
  startDate: "Nov 2026",
  themeColor: "#009CDE",
  logos: {
    light: "/assets/logos/ncaa-blue.svg",
    dark: "/assets/logos/ncaa-white.svg",
  },
  dataVerified: false,
} as const satisfies LeagueRegistryEntry;

/** Immutable NCAA registry entries keyed by slug. */
export const NCAA_LEAGUE_REGISTRY = {
  cfb: CFB_LEAGUE_ENTRY,
  cbb: CBB_LEAGUE_ENTRY,
} as const;

export type NcaaLeagueSlug = keyof typeof NCAA_LEAGUE_REGISTRY;

export function getLeagueRegistryEntry(
  leagueId: LeagueId,
): LeagueRegistryEntry | undefined {
  if (leagueId in NCAA_LEAGUE_REGISTRY) {
    return NCAA_LEAGUE_REGISTRY[leagueId as NcaaLeagueSlug];
  }
  return undefined;
}

export function leagueLogoForTheme(
  leagueId: LeagueId,
  colorMode: "light" | "dark",
): string | undefined {
  const entry = getLeagueRegistryEntry(leagueId);
  if (!entry) return undefined;
  return colorMode === "light" ? entry.logos.light : entry.logos.dark;
}

/** Overview hub cards render only when underlying data is verified. */
export function isLeagueCardVisible(
  leagueId: LeagueId,
  stats?: RefStatsFile | null,
): boolean {
  const registry = getLeagueRegistryEntry(leagueId);
  if (registry) {
    return resolveNcaaDataVerifiedForLeagueId(leagueId, stats ?? undefined);
  }
  return isVerifiedLiveLeague(leagueId);
}

export function isCatalogSlugVisible(
  slug: string,
  stats?: RefStatsFile | null,
): boolean {
  if (slug in NCAA_LEAGUE_REGISTRY) {
    return resolveNcaaDataVerifiedForLeagueId(
      slug as NcaaLeagueSlug,
      stats ?? undefined,
    );
  }
  return true;
}
