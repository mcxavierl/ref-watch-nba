import type { ReactNode } from "react";
import { DynamicInsightPillRow } from "@/components/DynamicInsightPill";
import { FavoritesStar } from "@/components/FavoritesStar";
import { RefAvatar } from "@/components/RefAvatar";
import { RefereeWhistleDispositionStrip } from "@/components/RefereeWhistleDispositionStrip";
import { RefereeWhistleMetricToggle } from "@/components/RefereeWhistleMetricToggle";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import { buildRefMasterInsights } from "@/lib/ref-master-insights";
import { whistleIndexFromRefProfile } from "@/lib/whistle-index";
import { isWhistleTaxonomyLeague } from "@/config/penalty-types";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type RefAvatarSport = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
type FavoritesLeague = RefAvatarSport;

export type RefereeMasterCardProps = {
  profile: RefProfile;
  leagueId: LeagueId;
  stats: RefStatsFile;
  sport: RefAvatarSport;
  qualified: boolean;
  sampleGateMessage?: ReactNode;
  avatarSize?: "lg" | "xl";
  avatarClassName?: string;
  numberSlot?: ReactNode;
  children?: ReactNode;
};

/**
 * Unified referee profile header with consolidated request-scoped insight pills.
 * Heavy anomaly blocks (marquee, whistle drift, geo) collapse into DynamicInsightPill.
 */
export function RefereeMasterCard({
  profile,
  leagueId,
  stats,
  sport,
  qualified,
  sampleGateMessage,
  avatarSize = "lg",
  avatarClassName,
  numberSlot,
  children,
}: RefereeMasterCardProps) {
  const insights = buildRefMasterInsights(leagueId, profile, stats, qualified);
  const whistleIndex = qualified ? whistleIndexFromRefProfile(profile) : null;

  return (
    <header className="page-profile-header">
      <div className="page-hero-head">
        <RefAvatar
          name={profile.name}
          slug={profile.slug}
          sport={sport}
          size={avatarSize}
          decorative={false}
          className={avatarClassName}
        />
        <div className="page-hero-head-copy">
          <div className="page-hero-head-title-row">
            <h1 className="page-title">{profile.name}</h1>
            {numberSlot ?? (
              <span className="font-mono text-sm text-muted">#{profile.number}</span>
            )}
            <FavoritesStar
              id={profile.slug}
              kind="ref"
              league={leagueId as FavoritesLeague}
              label={profile.name}
            />
          </div>
          <DynamicInsightPillRow insights={insights} />
          {whistleIndex !== null ? (
            <div className="mt-3 max-w-xs">
              <WhistleIndexGauge index={whistleIndex} size="sm" />
            </div>
          ) : null}
          {isWhistleTaxonomyLeague(leagueId) ? (
            <RefereeWhistleDispositionStrip
              profile={profile}
              leagueId={leagueId}
              stats={stats}
              scopedSeasons={stats.meta.seasons}
              showMetrics={qualified}
            />
          ) : null}
          {leagueId === "nfl" && profile.nflAnalytics ? (
            <RefereeWhistleMetricToggle
              analytics={profile.nflAnalytics}
              showMetrics={qualified}
              className="mt-2"
            />
          ) : null}
        </div>
      </div>

      {!qualified && sampleGateMessage ? (
        <p className="ref-sample-gate-notice">{sampleGateMessage}</p>
      ) : null}

      {children}
    </header>
  );
}
