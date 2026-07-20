import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { CloseGameSection } from "@/components/CloseGameSection";
import { RefereeWhistleDispositionStrip } from "@/components/RefereeWhistleDispositionStrip";
import { RefGsniSection } from "@/components/RefGsniSection";
import { GsniGauge } from "@/components/GsniGauge";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { gsniShrinkageFromProfile } from "@/lib/gsni-display";
import { isWhistleTaxonomyLeague } from "@/config/penalty-types";
import type { CloseGameMetrics } from "@/lib/close-game";
import type { LeagueId } from "@/lib/leagues";
import { whistleIndexFromRefProfile } from "@/lib/whistle-index";
import type { RefGsniMetrics } from "@/lib/ref-gsni";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type CloseGameLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB" | "WNBA";

/** Consolidated whistle index, analytics, and GSNI with gauge-first layout. */
export function RefProfileOfficiatingBiasSection({
  profile,
  leagueId,
  stats,
  qualified,
  gsniMetrics,
  closeGameMetrics,
  closeGameLeague,
  whistleAnalytics,
}: {
  profile: RefProfile;
  leagueId: LeagueId;
  stats: RefStatsFile;
  qualified: boolean;
  gsniMetrics?: RefGsniMetrics | null;
  closeGameMetrics?: CloseGameMetrics[];
  closeGameLeague?: CloseGameLeague;
  whistleAnalytics?: ReactNode;
}) {
  const whistleIndex = qualified ? whistleIndexFromRefProfile(profile) : null;
  const gsniDisplay = qualified ? gsniShrinkageFromProfile(profile) : null;
  const gameStateIndex = gsniDisplay?.display ?? null;
  const hasGsni = gsniMetrics !== undefined && gsniMetrics !== null;
  const hasWhistleBlock = whistleIndex !== null || whistleAnalytics || isWhistleTaxonomyLeague(leagueId);

  if (!hasWhistleBlock && !hasGsni && !closeGameMetrics?.length) {
    return null;
  }

  const splitAnalyticsAndGsni = Boolean(whistleAnalytics && hasGsni);

  return (
    <section
      className="ref-profile-section ref-officiating-bias"
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

      <div className="ref-table-section-body">
        {(whistleIndex !== null || gameStateIndex !== null) && (
          <div className="ref-officiating-gauge-row">
            {whistleIndex !== null ? (
              <WhistleIndexGauge index={whistleIndex} size="lg" className="min-w-0 flex-1" />
            ) : null}
            {gameStateIndex !== null ? (
              gsniDisplay?.tooltip ? (
                <MetricInfoHint hint={gsniDisplay.tooltip}>
                  <GsniGauge index={gameStateIndex} size="lg" className="min-w-0 flex-1" />
                </MetricInfoHint>
              ) : (
                <GsniGauge index={gameStateIndex} size="lg" className="min-w-0 flex-1" />
              )
            ) : null}
          </div>
        )}

        {isWhistleTaxonomyLeague(leagueId) ? (
          <RefereeWhistleDispositionStrip
            profile={profile}
            leagueId={leagueId}
            stats={stats}
            scopedSeasons={stats.meta.seasons}
            showMetrics={qualified}
            className="mt-4"
          />
        ) : null}

        <div
          className={`ref-officiating-bias-grid${splitAnalyticsAndGsni ? " ref-officiating-bias-grid--split" : ""}`}
        >
          {whistleAnalytics ? (
            <div className="ref-officiating-bias-col">{whistleAnalytics}</div>
          ) : null}
          {hasGsni ? (
            <div className="ref-officiating-bias-col">
              <RefGsniSection
                metrics={gsniMetrics ?? null}
                refName={profile.name}
                showMetrics={qualified}
                embedded
              />
            </div>
          ) : null}
        </div>

        {closeGameMetrics && closeGameMetrics.length > 0 && closeGameLeague ? (
          <CloseGameSection
            metrics={closeGameMetrics}
            subjectLabel={profile.name}
            league={closeGameLeague}
            embedded
          />
        ) : null}
      </div>
    </section>
  );
}
