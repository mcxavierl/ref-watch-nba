import { PrefetchLink } from "@/components/PrefetchLink";
import { GitCompareArrows } from "lucide-react";
import { buildCrewCompareHref } from "@/lib/ref-compare";
import type { LeagueId } from "@/lib/leagues";

export function CompareMatchupRefsLink({
  leagueId,
  officials,
  className,
  compact = false,
}: {
  leagueId: LeagueId;
  officials: Array<{ name: string; number: number }>;
  className?: string;
  compact?: boolean;
}) {
  const href = buildCrewCompareHref(leagueId, officials);
  if (!href) return null;

  return (
    <PrefetchLink
      href={href}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
      }
      prefetch={true}
      aria-label="Compare assigned matchup refs"
    >
      <GitCompareArrows className="size-3.5 shrink-0" aria-hidden />
      {compact ? "Compare" : "Compare matchup refs"}
    </PrefetchLink>
  );
}
