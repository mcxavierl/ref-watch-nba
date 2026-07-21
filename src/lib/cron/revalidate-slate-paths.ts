import { revalidatePath } from "next/cache";

const SLATE_REVALIDATE_PATHS = ["/", "/compare"] as const;

export function revalidateSlatePaths(): string[] {
  for (const route of SLATE_REVALIDATE_PATHS) {
    revalidatePath(route);
  }
  return [...SLATE_REVALIDATE_PATHS];
}

export const SLATE_API_CACHE_TAGS = ["slate-upcoming", "slate-projections"] as const;

export function slateApiCacheKeys(): string[] {
  return [
    "api:v1:games:upcoming",
    "api:slate:scores",
    ...SLATE_API_CACHE_TAGS,
  ];
}
