import Link from "next/link";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import { CbbAnalyticsLeaders } from "@/components/CbbAnalyticsLeaders";
import { NcaaConferenceLogo } from "@/components/NcaaConferenceLogo";
import { buildCbbAnalyticsLeaders } from "@/lib/cbb/analytics-leaders";
import type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";
import {
  cbbTrendsConferenceLabel,
  cbbTrendsConferenceSlug,
} from "@/lib/cbb/conference-trends-shared";
import type { LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";
import type { RefStatsFile } from "@/lib/types";
import "@/components/conference-coverage.css";

export function CbbConferenceHub({
  conference,
  refStats,
  distinctGames,
}: {
  conference: LiveNcaaConferenceId;
  refStats: RefStatsFile;
  distinctGames: number;
}) {
  const label = cbbTrendsConferenceLabel(conference as CbbTrendsConferenceScope);
  const leaders = buildCbbAnalyticsLeaders(refStats);

  return (
    <section className="cbb-conference-hub section-block" aria-labelledby="cbb-conference-hub-title">
      <div className="cbb-conference-hub-head">
        <Link href="/cbb" className="cbb-conference-hub-back">
          ← All conferences
        </Link>
        <div className="cbb-conference-hub-title-row">
          <NcaaConferenceLogo conferenceId={conference} size={40} />
          <div>
            <h2 className="section-title" id="cbb-conference-hub-title">
              {label}
            </h2>
            <p className="section-lead">
              {distinctGames > 0
                ? `${distinctGames.toLocaleString("en-US")} verified games with referee coverage in this conference.`
                : "Referee analytics scoped to this conference."}
            </p>
          </div>
        </div>
      </div>

      {leaders.length > 0 ? (
        <CbbAnalyticsLeaders
          leaders={leaders}
          title={`${label} leaders`}
          lead="Top whistle and scoring outliers from verified games in this conference."
        />
      ) : null}

      <div className="section-block section-block-tight">
        <div className="section-block-header">
          <h3 className="section-title">Referee rankings</h3>
          <p className="section-lead">
            Officials ranked by conference-scoped tendencies. Open a profile for full splits.
          </p>
        </div>
        <div className="data-card">
          <RefRankingsTable
            refs={refStats.refs}
            league="CBB"
            minSampleSize={refStats.meta.minSampleSize}
            overBaseline={refStats.meta.leagueOverBaseline}
            leagueAvgTotal={refStats.meta.leagueAvgTotal}
            basePath="/cbb"
            initialRowLimit={10}
          />
        </div>
        <p className="cbb-conference-hub-more">
          <Link
            href={`/cbb/research/tendencies?conference=${cbbTrendsConferenceSlug(conference as CbbTrendsConferenceScope)}`}
            className="site-footer-inline-link"
          >
            Full tendencies hub →
          </Link>
        </p>
      </div>
    </section>
  );
}
