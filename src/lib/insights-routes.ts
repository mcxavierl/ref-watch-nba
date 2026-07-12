import type { HubHeroLeagueId } from "@/components/LeagueHubHero";
import { LEAGUES } from "@/lib/leagues";
import { normalizeAppPathname } from "@/lib/json-asset-guards";

export type InsightsHubView = "tendencies" | "trends" | "findings";

const TAB_SEGMENTS: Record<InsightsHubView, string> = {
  tendencies: "rankings",
  trends: "trends",
  findings: "research",
};

/** Canonical route for an insights sub-view (NBA uses unprefixed paths). */
export function insightsViewHref(
  leagueId: HubHeroLeagueId,
  view: InsightsHubView,
): string {
  const prefix = LEAGUES[leagueId].pathPrefix;
  const segment = TAB_SEGMENTS[view];
  return prefix ? `${prefix}/${segment}` : `/${segment}`;
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
  for (const [view, segment] of Object.entries(TAB_SEGMENTS) as [
    InsightsHubView,
    string,
  ][]) {
    const leaguePath = new RegExp(`/[^/]+/${segment}$`);
    if (path === `/${segment}` || leaguePath.test(path)) {
      return view;
    }
  }
  return null;
}
