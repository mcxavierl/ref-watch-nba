import type { ReactNode } from "react";
import { DynamicInsightPillRow } from "@/components/DynamicInsightPill";
import { FavoritesStar } from "@/components/FavoritesStar";
import { RefAvatar } from "@/components/RefAvatar";
import { RefCompareLink } from "@/components/RefCompareLink";
import { RefFingerprintBadgeGrid } from "@/components/ref-profile/RefFingerprintBadgeGrid";
import "@/components/ref-profile/officiating-intelligence-profile.css";
import { buildRefMasterInsights } from "@/lib/ref-master-insights";
import type { RefIntelligenceFingerprint } from "@/lib/ref-intelligence-profile";
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
  intelligenceFingerprint?: RefIntelligenceFingerprint;
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
  intelligenceFingerprint,
  children,
}: RefereeMasterCardProps) {
  const insights = buildRefMasterInsights(leagueId, profile, stats, qualified);
  const intelligenceMode = Boolean(intelligenceFingerprint);

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
            {intelligenceMode ? (
              <h1 className="page-title ref-intelligence-profile-title">
                Officiating Intelligence Profile: {profile.name}
              </h1>
            ) : (
              <h1 className="page-title">{profile.name}</h1>
            )}
            {numberSlot ?? (
              <span className="font-tabular text-sm text-muted">#{profile.number}</span>
            )}
            <FavoritesStar
              id={profile.slug}
              kind="ref"
              league={leagueId as FavoritesLeague}
              label={profile.name}
            />
            {intelligenceMode ? (
              <RefCompareLink
                leagueId={leagueId}
                slug={profile.slug}
                className="ref-profile-meta-item ref-compare-entry-link text-sm"
              />
            ) : null}
          </div>
          {intelligenceFingerprint ? (
            <RefFingerprintBadgeGrid fingerprint={intelligenceFingerprint} />
          ) : (
            <div className="ref-master-insight-pills">
              <DynamicInsightPillRow insights={insights} />
            </div>
          )}
        </div>
      </div>

      {!qualified && sampleGateMessage ? (
        <p className="ref-sample-gate-notice">{sampleGateMessage}</p>
      ) : null}

      {children}
    </header>
  );
}
