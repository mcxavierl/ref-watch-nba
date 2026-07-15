import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  REF_CARD_BODY_CLASS,
  REF_CARD_HEAD_CLASS,
  REF_CARD_ICON_CLASS,
  REF_CARD_KICKER_CLASS,
  REF_CARD_METRIC_CLASS,
  REF_CARD_METRIC_DETAIL_CLASS,
  REF_CARD_METRIC_LABEL_CLASS,
  RefCard,
} from "@/components/hub/RefCard";
import { RefAvatar } from "@/components/RefAvatar";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import type { HighlightCardAccent, HighlightCardTone } from "@/lib/highlight-card-visuals";
import type { LeagueId } from "@/lib/leagues";
import { statValueDelightTone } from "@/lib/metric-delight";

export function HighlightStatCard({
  leagueId,
  insightKind,
  accent,
  tone,
  icon: Icon,
  kicker,
  refName,
  refSlug,
  basePath = "",
  statValue,
  statLabel,
  body,
  avatarSport,
  refMeta,
}: {
  leagueId: LeagueId;
  insightKind: string;
  accent: HighlightCardAccent;
  tone: HighlightCardTone;
  icon: LucideIcon;
  kicker: string;
  refName?: string;
  refSlug?: string;
  basePath?: string;
  statValue?: string;
  statLabel?: string;
  body: string;
  avatarSport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  refMeta?: string;
}) {
  const metricTone = statValue ? statValueDelightTone(statValue) : "neutral";

  const profile =
    refSlug && refName ? (
      <Link href={`${basePath}/refs/${refSlug}`} className="highlight-stat-profile">
        {avatarSport ? (
          <RefAvatar name={refName} slug={refSlug} sport={avatarSport} size="lg" />
        ) : null}
        <span className="highlight-stat-profile-copy">
          <span className="rankings-insight-name">{refName}</span>
          {refMeta ? <span className="highlight-stat-profile-meta">{refMeta}</span> : null}
        </span>
      </Link>
    ) : refName ? (
      <p className="rankings-insight-name">{refName}</p>
    ) : null;

  return (
    <RefCard
      data-league={leagueId}
      data-insight={insightKind}
      data-accent={accent}
      data-tone={tone}
    >
      <div className={REF_CARD_HEAD_CLASS}>
        <span className={`${REF_CARD_ICON_CLASS} ref-card-icon--badge`} aria-hidden>
          <Icon className="rankings-insight-icon-glyph" strokeWidth={2.1} />
        </span>
        <p className={REF_CARD_KICKER_CLASS}>{kicker}</p>
      </div>
      {profile}
      {statValue ? (
        <div className="ref-card-metric-block" aria-label={statLabel}>
          <div className={REF_CARD_METRIC_CLASS}>
            <StandoutMetricValue tone={metricTone} size="lg">
              {statValue}
            </StandoutMetricValue>
          </div>
          {statLabel ? (
            <p className={REF_CARD_METRIC_LABEL_CLASS}>{statLabel}</p>
          ) : null}
        </div>
      ) : null}
      <p className={`${REF_CARD_BODY_CLASS} ${REF_CARD_METRIC_DETAIL_CLASS}`}>{body}</p>
    </RefCard>
  );
}
