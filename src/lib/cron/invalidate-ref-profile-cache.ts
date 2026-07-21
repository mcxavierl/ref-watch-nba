import { revalidatePath } from "next/cache";
import { refProfileHref } from "@/lib/leagues";
import type { LeagueId } from "@/lib/leagues";

export const REF_PROFILE_API_CACHE_TAGS = [
  "ref-profile",
  "ref-scouting-report",
  "ref-archetype",
] as const;

export function refProfileCacheKeys(leagueId: LeagueId, slug: string): string[] {
  return [
    `api:v1:refs:${leagueId}:${slug}`,
    `api:v1:refs:${leagueId}:${slug}:scouting-report`,
    `api:v1:refs:${leagueId}:${slug}:archetype`,
    ...REF_PROFILE_API_CACHE_TAGS.map((tag) => `${tag}:${leagueId}:${slug}`),
  ];
}

export function invalidateRefProfileCaches(
  leagueId: LeagueId,
  slugs: string[],
): string[] {
  const invalidated: string[] = [];
  for (const slug of slugs) {
    const profilePath = refProfileHref(leagueId, slug);
    try {
      revalidatePath(profilePath);
    } catch {
      // Outside a Next.js request/static generation context (tests, CLI workers).
    }
    invalidated.push(profilePath);
  }
  return invalidated;
}
