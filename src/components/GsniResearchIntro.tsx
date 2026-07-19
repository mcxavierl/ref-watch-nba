import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { TermHelp } from "@/components/TermHelp";
import {
  gsniHighLeverageStatesCopy,
  gsniIndexScoreExplainer,
} from "@/lib/gsni-display";
import type { InsightsLeagueId } from "@/lib/league-manifest";

export function GsniResearchIntro({
  leagueId,
  ratedCount,
  trackedCount,
}: {
  leagueId: InsightsLeagueId;
  ratedCount: number;
  trackedCount: number;
}) {
  if (leagueId !== "nfl" && leagueId !== "nba") return null;

  return (
    <details className="methodology-accordion gsni-research-info mb-4">
      <summary className="methodology-accordion-trigger">
        <span>
          <TermHelp id="game-state-index">Game-State Index definition and methodology</TermHelp>
        </span>
        <ChevronDown className="methodology-accordion-chevron" aria-hidden />
      </summary>
      <div className="methodology-accordion-panel px-5 pb-4">
        <p className="insights-trends-body mt-0 mb-0">
          {gsniHighLeverageStatesCopy(leagueId)}
        </p>
        <p className="gsni-sub-text mt-3 mb-0">{gsniIndexScoreExplainer(leagueId)}</p>
        <p className="gsni-sub-text mt-3 mb-0">
          {ratedCount} official{ratedCount === 1 ? "" : "s"} rated
          {trackedCount > ratedCount
            ? ` · ${trackedCount - ratedCount} still building high-leverage sample`
            : ""}
          .{" "}
          <Link href="/research/leverage-spike-anomaly" className="font-medium hover:underline">
            Full methodology
          </Link>
          .
        </p>
      </div>
    </details>
  );
}
