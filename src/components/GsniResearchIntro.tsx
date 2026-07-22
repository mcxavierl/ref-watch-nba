import { SiteNavLink as Link } from "@/components/SiteNavLink";
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
  if (leagueId !== "nfl" && leagueId !== "nba" && leagueId !== "nhl") return null;

  return (
    <section className="section-block-tight mb-4" aria-labelledby="gsni-research-intro-title">
      <div className="insights-trends-panel panel-inset px-4 py-4 sm:px-5">
        <h2 className="insights-trends-title m-0" id="gsni-research-intro-title">
          <TermHelp id="game-state-index">What the Game-State Index measures</TermHelp>
        </h2>
        <p className="insights-trends-body mt-2 mb-0">
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
    </section>
  );
}
