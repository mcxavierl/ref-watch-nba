import type { HubHeroLeagueId } from "@/components/LeagueHubHero";
import {
  LEAGUE_MANIFEST,
  researchViewHref,
  type LeagueManifestId,
  type ResearchView,
} from "@/lib/league-manifest";
import { normalizeAppPathname } from "@/lib/json-asset-guards";

export type InsightsHubView = "tendencies" | "trends" | "findings";

const VIEW_TO_RESEARCH: Record<InsightsHubView, ResearchView> = {
  tendencies: "tendencies",
  trends: "trends",
  findings: "findings",
};

/** Canonical route for an insights sub-view under /{league}/research/{view}. */
export function insightsViewHref(
  leagueId: HubHeroLeagueId,
  view: InsightsHubView,
): string {
  return researchViewHref(leagueId as LeagueManifestId, VIEW_TO_RESEARCH[view]);
}

/** Legacy hash aliases still linked from older cards. */
const HASH_ALIASES: Record<string, InsightsHubView> = {
  rankings: "tendencies",
  tendencies: "tendencies",
  trends: "trends",
  findings: "findings",
  research: "findings",
};

export function insightsViewFromHash(hash: string): InsightsHubView | null {
  const raw = hash.replace(/^#/, "").trim();
  if (!raw) return null;
  return HASH_ALIASES[raw] ?? null;
}

export function insightsViewFromPathname(pathname: string): InsightsHubView | null {
  const path = normalizeAppPathname(pathname);
  for (const leagueId of Object.keys(LEAGUE_MANIFEST) as LeagueManifestId[]) {
    const prefix = LEAGUE_MANIFEST[leagueId].pathPrefix;
    if (path === `${prefix}/research/tendencies`) return "tendencies";
    if (path === `${prefix}/research/trends`) return "trends";
    if (path === `${prefix}/research/findings` || path.startsWith(`${prefix}/research/findings/`)) {
      return "findings";
    }
    // Legacy paths during redirect window
    if (path === `${prefix}/rankings`) return "tendencies";
    if (path === `${prefix}/trends`) return "trends";
    if (path === `${prefix}/research` || path.startsWith(`${prefix}/research/`)) {
      if (path.includes("/findings/")) return "findings";
      if (path.endsWith("/trends")) return "trends";
      if (path.endsWith("/tendencies")) return "tendencies";
      return "findings";
    }
  }
  // Legacy NBA root paths
  if (path === "/rankings") return "tendencies";
  if (path === "/trends") return "trends";
  if (path === "/research" || path.startsWith("/research/")) return "findings";
  return null;
}
