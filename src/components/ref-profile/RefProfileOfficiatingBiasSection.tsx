import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { RefereeWhistleDispositionStrip } from "@/components/RefereeWhistleDispositionStrip";
import { RefGsniSection } from "@/components/RefGsniSection";
import { GsniGauge } from "@/components/GsniGauge";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { gsniShrinkageFromProfile } from "@/lib/gsni-display";
import { isWhistleTaxonomyLeague } from "@/config/penalty-types";
import type { LeagueId } from "@/lib/leagues";
import { whistleIndexFromRefProfile } from "@/lib/whistle-index";
import type { RefGsniMetrics } from "@/lib/ref-gsni";
import type { RefProfile, RefStatsFile } from "@/lib/types";

/** Consolidated whistle index, analytics, and GSNI with gauge-first layout. */
export function RefProfileOfficiatingBiasSection({
  profile,
  leagueId,
  stats,
  qualified,
  gsniMetrics,
  whistleAnalytics,
}: {
  profile: RefProfile;
  leagueId: LeagueId;
  stats: RefStatsFile;
  qualified: boolean;
  gsniMetrics?: RefGsniMetrics | null;
  whistleAnalytics?: ReactNode;
}) {
  const whistleIndex = qualified ? whistleIndexFromRefProfile(profile) : null;
  const gsniDisplay = qualified ? gsniShrinkageFromProfile(profile) : null;
  const gameStateIndex = gsniDisplay?.display ?? null;
  const hasGsni = gsniMetrics !== undefined && gsniMetrics !== null;
  const hasWhistleBlock = whistleIndex !== null || whistleAnalytics || isWhistleTaxonomyLeague(leagueId);
  const showDispositionGrid =
    qualified && isWhistleTaxonomyLeague(leagueId);
  const showSecondaryGrid = showDispositionGrid || Boolean(whistleAnalytics);

  if (!hasWhistleBlock && !hasGsni) {
    return null;
  }

  return (
    <section
      className="ref-profile-section ref-officiating-bias flex h-fit flex-col"
      aria-labelledby="ref-officiating-bias-title"
    >
      <div className="ref-table-section-header">
        <h2
          id="ref-officiating-bias-title"
          className="ref-profile-section-title flex min-w-0 items-center gap-2"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-indigo-400" strokeWidth={2.1} aria-hidden />
          Officiating Bias
        </h2>
        <p className="ref-officiating-bias-lead mt-1 text-sm text-slate-400">
          Whistle volume, penalty disposition, and high-leverage game-state tendencies.
        </p>
      </div>

      <div className="ref-table-section-body flex flex-col">
        {whistleIndex !== null ? (
          <WhistleIndexGauge index={whistleIndex} size="lg" className="w-full" />
        ) : gameStateIndex !== null ? (
          gsniDisplay?.tooltip ? (
            <MetricInfoHint hint={gsniDisplay.tooltip}>
              <GsniGauge index={gameStateIndex} size="lg" className="w-full" />
            </MetricInfoHint>
          ) : (
            <GsniGauge index={gameStateIndex} size="lg" className="w-full" />
          )
        ) : null}

        {showSecondaryGrid ? (
          <div className="grid grid-cols-2 gap-4 mt-6 ref-officiating-bias-secondary-grid">
            {showDispositionGrid ? (
              <RefereeWhistleDispositionStrip
                profile={profile}
                leagueId={leagueId}
                stats={stats}
                scopedSeasons={stats.meta.seasons}
                showMetrics={qualified}
                layout="grid"
              />
            ) : null}
            {whistleAnalytics ? (
              <div className="col-span-2 min-w-0 ref-officiating-bias-analytics-slot">
                {whistleAnalytics}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasGsni ? (
          <div className="mt-6">
            <RefGsniSection
              metrics={gsniMetrics ?? null}
              refName={profile.name}
              showMetrics={qualified}
              embedded
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
