import Link from "next/link";
import type { LucideIcon } from "lucide-react";
/**
 * CLINICAL MODERN STANDARD: High-accuracy data visualization. All volatility-prone
 * metrics must display maturity indicators and adjusted projections.
 */
import {
  REF_CARD_BODY_CLASS,
  REF_CARD_HEAD_CLASS,
  REF_CARD_ICON_CLASS,
  REF_CARD_KICKER_CLASS,
  REF_CARD_METRIC_CLASS,
  REF_CARD_METRIC_DETAIL_CLASS,
  REF_CARD_METRIC_LABEL_CLASS,
  RefCard,
  StatComparison,
} from "@/components/hub/RefCard";
import { RefAvatar } from "@/components/RefAvatar";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { DataHonestyFootnote } from "@/components/shared/DataHonestyFootnote";
import { DataMaturityBar } from "@/components/shared/DataMaturityBar";
import { PreliminaryDataBadge } from "@/components/shared/PreliminaryDataBadge";
import {
  adjustedDeltaTooltipText,
  displayWinRateDelta,
  formatDeltaPp,
  formatSampleSizeLabel,
  isPreliminarySample,
} from "@/lib/data-maturity";
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
  sampleGames,
  rawDeltaPp,
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
  sampleGames?: number;
  rawDeltaPp?: number;
}) {
  const usesSplitHierarchy =
    sampleGames !== undefined &&
    sampleGames > 0 &&
    rawDeltaPp !== undefined &&
    (isPreliminarySample(sampleGames) || statLabel?.toLowerCase().includes("baseline"));
  const deltaDisplay =
    usesSplitHierarchy && rawDeltaPp !== undefined
      ? displayWinRateDelta(rawDeltaPp, sampleGames!)
      : null;
  const primaryValue = usesSplitHierarchy
    ? formatSampleSizeLabel(sampleGames!)
    : statValue;
  const primaryLabel = usesSplitHierarchy ? "Sample size" : statLabel;
  const secondaryValue =
    usesSplitHierarchy && deltaDisplay
      ? formatDeltaPp(deltaDisplay.displayDelta)
      : undefined;
  const secondaryLabel =
    usesSplitHierarchy && deltaDisplay?.isAdjusted
      ? "Calculated projection"
      : usesSplitHierarchy
        ? "Win rate delta"
        : undefined;
  const metricTone =
    tone === "neutral" || usesSplitHierarchy
      ? "neutral"
      : primaryValue
        ? statValueDelightTone(primaryValue)
        : "neutral";

  const profile =
    refSlug && refName ? (
      <Link href={`${basePath}/refs/${refSlug}`} className="highlight-stat-profile">
        {avatarSport ? (
          <RefAvatar name={refName} slug={refSlug} sport={avatarSport} size="lg" />
        ) : null}
        <span className="highlight-stat-profile-copy">
          <span className="rankings-insight-name">{refName}</span>
          {usesSplitHierarchy ? (
            <span className="highlight-stat-profile-meta highlight-stat-profile-meta--primary">
              {formatSampleSizeLabel(sampleGames!)}
            </span>
          ) : null}
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
      {primaryValue ? (
        <div className="ref-card-metric-block" aria-label={primaryLabel}>
          <div className={REF_CARD_METRIC_CLASS}>
            <StandoutMetricValue tone={metricTone} size="lg">
              {primaryValue}
            </StandoutMetricValue>
          </div>
          {primaryLabel ? (
            <p className={REF_CARD_METRIC_LABEL_CLASS}>{primaryLabel}</p>
          ) : null}
          {secondaryValue ? (
            <div className="ref-card-metric-block ref-card-metric-block--secondary">
              <div className={`${REF_CARD_METRIC_CLASS} ${REF_CARD_METRIC_DETAIL_CLASS}`}>
                <StandoutMetricValue
                  tone={metricTone}
                  size="md"
                  title={
                    deltaDisplay?.isAdjusted
                      ? adjustedDeltaTooltipText(deltaDisplay.displayDelta)
                      : undefined
                  }
                >
                  {secondaryValue}
                </StandoutMetricValue>
              </div>
              {secondaryLabel ? (
                <p className={REF_CARD_METRIC_LABEL_CLASS}>{secondaryLabel}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <p className={`${REF_CARD_BODY_CLASS} ${REF_CARD_METRIC_DETAIL_CLASS}`}>
        <StatComparison>{body}</StatComparison>
      </p>
      {deltaDisplay?.isAdjusted ? <DataHonestyFootnote /> : null}
    </RefCard>
  );
}
