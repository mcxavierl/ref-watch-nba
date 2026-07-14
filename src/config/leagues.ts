import {
  formatLeagueSeasonStart,
  getLeagueConfigEntry,
  LEAGUE_CONFIG,
  type LeagueRegistryEntry,
} from "@/config/leagueConfig";
import type { LeagueId } from "@/lib/leagues";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { isVerifiedLiveLeague } from "@/lib/league-verification";
import { resolveNcaaDataVerifiedForLeagueId } from "@/lib/ncaa-pipeline";
import type { RefStatsFile } from "@/lib/types";

export type { LeagueRegistryEntry } from "@/config/leagueConfig";
export {
  formatLeagueSeasonStart,
  getLeagueConfigEntry,
  LEAGUE_CONFIG,
} from "@/config/leagueConfig";

export type LeagueThemeLogos = {
  /** Logo for light backgrounds (higher contrast mark). */
  light: string;
  /** Logo for dark backgrounds (knockout / white mark). */
  dark: string;
};

/** Shared NCAA brand color; sport-specific marks live on each league entry. */
export const NCAA_BRAND_ASSETS = {
  themeColor: "#009CDE",
  logos: {
    light: "/assets/logos/ncaa-blue.svg",
    dark: "/assets/logos/ncaa-white.svg",
  },
} as const satisfies {
  themeColor: string;
  logos: LeagueThemeLogos;
};

export const CFB_LEAGUE_ENTRY = LEAGUE_CONFIG.cfb!;
export const CBB_LEAGUE_ENTRY = LEAGUE_CONFIG.cbb!;

/** Immutable NCAA registry entries keyed by slug. */
export const NCAA_LEAGUE_REGISTRY = {
  cfb: CFB_LEAGUE_ENTRY,
  cbb: CBB_LEAGUE_ENTRY,
} as const;

export type NcaaLeagueSlug = keyof typeof NCAA_LEAGUE_REGISTRY;

export {
  DASHBOARD_GRID_LEAGUE_IDS,
  isDashboardLeagueExposed,
} from "@/config/leagues-dashboard";

export function getLeagueRegistryEntry(
  leagueId: LeagueId,
): LeagueRegistryEntry | undefined {
  return getLeagueConfigEntry(leagueId);
}

export function leagueLogoForTheme(
  leagueId: LeagueId,
  colorMode: "light" | "dark",
): string | undefined {
  const entry = getLeagueRegistryEntry(leagueId);
  if (!entry?.logos) return undefined;
  return colorMode === "light" ? entry.logos.light : entry.logos.dark;
}

export function isNcaaLeagueSlug(leagueId: LeagueId): leagueId is NcaaLeagueSlug {
  return leagueId in NCAA_LEAGUE_REGISTRY;
}

function ncaaAnalyticsUnlocked(
  leagueId: NcaaLeagueSlug,
  stats?: RefStatsFile | null,
): boolean {
  const entry = NCAA_LEAGUE_REGISTRY[leagueId];
  if (entry.dataVerified !== true) return false;
  return resolveNcaaDataVerifiedForLeagueId(leagueId, stats ?? undefined);
}

/** Hub links, quick lists, and detailed analytics require full verification. */
export function isLeagueAnalyticsUnlocked(
  leagueId: LeagueId,
  stats?: RefStatsFile | null,
): boolean {
  if (isNcaaLeagueSlug(leagueId)) {
    return ncaaAnalyticsUnlocked(leagueId, stats);
  }
  return isVerifiedLiveLeague(leagueId);
}

/** @deprecated Use isDashboardLeagueExposed for grid visibility or isLeagueAnalyticsUnlocked for hub access. */
export function isLeagueCardVisible(
  leagueId: LeagueId,
  stats?: RefStatsFile | null,
): boolean {
  if (isNcaaLeagueSlug(leagueId)) {
    return isVerifiedLiveLeague(leagueId);
  }
  return isLeagueAnalyticsUnlocked(leagueId, stats);
}

export function isCatalogSlugVisible(slug: string): boolean {
  if (slug in NCAA_LEAGUE_REGISTRY) {
    return isVerifiedLiveLeague(slug as NcaaLeagueSlug);
  }
  return true;
}
