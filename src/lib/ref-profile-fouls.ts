import { FoulCategory } from "@/lib/types/foul-categories";

export type FoulBreakdownFilter = "all" | "subjective" | "admin";

export type RefProfileFoulRecord = {
  id: string;
  label: string;
  gameId: string;
  date: string;
  matchup: string;
  team?: string;
  yards?: number;
  category?: FoulCategory;
};

/** Historical ingest rows without a category default to subjective judgment calls. */
export function resolveRefProfileFoulCategory(
  category?: FoulCategory,
): FoulCategory {
  return category ?? FoulCategory.SUBJECTIVE;
}

export function filterRefProfileFouls(
  fouls: readonly RefProfileFoulRecord[],
  filter: FoulBreakdownFilter,
): RefProfileFoulRecord[] {
  if (filter === "all") return [...fouls];
  return fouls.filter((foul) => {
    const category = resolveRefProfileFoulCategory(foul.category);
    if (filter === "admin") return category === FoulCategory.ADMIN;
    return category === FoulCategory.SUBJECTIVE;
  });
}
