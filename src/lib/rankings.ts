import type { RefProfile } from "@/lib/types";
import { bettingAtsRate, bettingOuRate } from "@/lib/stats-utils";

export type RefRankingSort =
  | "scoring-desc"
  | "scoring-asc"
  | "whistle-desc"
  | "whistle-asc"
  | "overRate-desc"
  | "overRate-asc"
  | "ats-desc"
  | "ats-asc"
  | "ouBetting-desc"
  | "ouBetting-asc"
  | "games-desc"
  | "games-asc";

export const REF_RANKING_SORT_LABELS: Record<RefRankingSort, string> = {
  "scoring-desc": "Scoring impact (high → low)",
  "scoring-asc": "Scoring impact (low → high)",
  "whistle-desc": "Whistle impact (high → low)",
  "whistle-asc": "Whistle impact (low → high)",
  "overRate-desc": "Over rate (high → low)",
  "overRate-asc": "Over rate (low → high)",
  "ats-desc": "Home ATS % (high → low)",
  "ats-asc": "Home ATS % (low → high)",
  "ouBetting-desc": "O/U hit % (high → low)",
  "ouBetting-asc": "O/U hit % (low → high)",
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
      case "ats":
        av = bettingAtsRate(a.bettingStats) ?? -1;
        bv = bettingAtsRate(b.bettingStats) ?? -1;
        break;
      case "ouBetting":
        av = bettingOuRate(a.bettingStats) ?? -1;
        bv = bettingOuRate(b.bettingStats) ?? -1;
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
