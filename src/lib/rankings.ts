import type { RefProfile } from "@/lib/types";

export type RefRankingSort =
  | "scoring-desc"
  | "scoring-asc"
  | "whistle-desc"
  | "whistle-asc"
  | "overRate-desc"
  | "overRate-asc"
  | "games-desc"
  | "games-asc";

export const REF_RANKING_SORT_LABELS: Record<RefRankingSort, string> = {
  "scoring-desc": "Scoring impact (high → low)",
  "scoring-asc": "Scoring impact (low → high)",
  "whistle-desc": "Whistle impact (high → low)",
  "whistle-asc": "Whistle impact (low → high)",
  "overRate-desc": "Over rate (high → low)",
  "overRate-asc": "Over rate (low → high)",
  "games-desc": "Games (most)",
  "games-asc": "Games (fewest)",
};

export function qualifiedRefs(
  refs: RefProfile[],
  minSample: number,
): RefProfile[] {
  return refs.filter((r) => r.games >= minSample);
}

export function sortRefRankings(
  refs: RefProfile[],
  sort: RefRankingSort,
): RefProfile[] {
  const copy = [...refs];
  const [field, direction] = sort.split("-") as [string, "asc" | "desc"];
  const sign = direction === "desc" ? -1 : 1;

  copy.sort((a, b) => {
    let av = 0;
    let bv = 0;
    switch (field) {
      case "scoring":
        av = a.totalPointsDelta;
        bv = b.totalPointsDelta;
        break;
      case "whistle":
        av = a.nhlAnalytics?.minorsDelta ?? a.foulsDelta;
        bv = b.nhlAnalytics?.minorsDelta ?? b.foulsDelta;
        break;
      case "overRate":
        av = a.overRate;
        bv = b.overRate;
        break;
      case "games":
        av = a.games;
        bv = b.games;
        break;
    }
    if (av !== bv) return (av - bv) * sign;
    return a.name.localeCompare(b.name);
  });

  return copy;
}
