import type { ReactNode } from "react";
import { DynamicInsightPillRow } from "@/components/DynamicInsightPill";
import { FavoritesStar } from "@/components/FavoritesStar";
import { RefProfileBroadcastKit } from "@/components/media/RefProfileBroadcastKit";
import { RefAvatar } from "@/components/RefAvatar";
import { buildRefMasterInsights } from "@/lib/ref-master-insights";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type RefAvatarSport = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";
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
 * Unified referee profile header: identity and master insight pills only.
 * Officiating gauges live in RefProfileOfficiatingBiasSection.
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
              <span className="font-tabular text-sm text-muted">#{profile.number}</span>
            )}
            <FavoritesStar
              id={profile.slug}
              kind="ref"
              league={leagueId as FavoritesLeague}
              label={profile.name}
            />
          </div>
          <div className="ref-master-insight-pills">
            <DynamicInsightPillRow insights={insights} />
          </div>
          <RefProfileBroadcastKit
            leagueId={leagueId}
            profile={profile}
            stats={stats}
            qualified={qualified}
            className="mt-3"
          />
        </div>
      </div>

      {!qualified && sampleGateMessage ? (
        <p className="ref-sample-gate-notice">{sampleGateMessage}</p>
      ) : null}

      {children}
    </header>
  );
}
