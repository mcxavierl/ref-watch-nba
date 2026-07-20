"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import {
  REF_CARD_BODY_CLASS,
  REF_CARD_HEAD_CLASS,
  REF_CARD_ICON_CLASS,
  REF_CARD_KICKER_CLASS,
  REF_CARD_METRIC_DETAIL_CLASS,
  REF_CARD_METRIC_LABEL_CLASS,
  RefCard,
  StatComparison,
} from "@/components/hub/RefCard";
import {
  spotlightAccentForCard,
  spotlightCardTone,
  spotlightIconForCard,
} from "@/lib/highlight-card-visuals";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { statValueDelightTone } from "@/lib/metric-delight";

function secondaryMetric(
  card: LeagueInsightCard,
): { value: string; caption: string } | null {
  const gamesStat = card.stats.find((stat) => stat.label === "Games");
  const rateStat = card.stats.find((stat) =>
    /over rate|under rate/i.test(stat.label),
  );

  if (/^games$/i.test(card.heroLabel.trim())) {
    return rateStat
      ? { value: rateStat.value, caption: rateStat.label }
      : null;
  }

  return gamesStat
    ? { value: gamesStat.value, caption: gamesStat.label }
    : null;
}

type RefsTrendSpotlightCardProps = {
  card: LeagueInsightCard;
};

export function RefsTrendSpotlightCard({
  card,
}: RefsTrendSpotlightCardProps) {
  const secondary = secondaryMetric(card);
  const accent = spotlightAccentForCard(card);
  const Icon = spotlightIconForCard(card);
  const tone = spotlightCardTone(card.heroTone);
  const primaryMetricTone =
    tone === "neutral" ? statValueDelightTone(card.heroValue) : tone;

  return (
    <RefCard
      className="refs-trend-spotlight-card"
      data-league={card.leagueId}
      data-insight="ref-spotlight"
      data-accent={accent}
      data-tone={tone}
    >
      <div className={REF_CARD_HEAD_CLASS}>
        <span className={`${REF_CARD_ICON_CLASS} ref-card-icon--badge`} aria-hidden>
          <Icon className="rankings-insight-icon-glyph" strokeWidth={2.1} />
        </span>
        <div className="refs-trend-spotlight-head-meta">
          <span className="refs-trend-spotlight-league">{card.shortLabel}</span>
          <LeagueSeasonStartBadge leagueId={card.leagueId} variant="glow" />
        </div>
        <p className={REF_CARD_KICKER_CLASS}>{card.kicker}</p>
      </div>

      <div className="refs-trend-spotlight-metrics insight-editorial-metrics">
        <div className="insight-editorial-metric insight-editorial-metric--primary">
          <StandoutMetricValue tone={primaryMetricTone} size="lg">
            {card.heroValue}
          </StandoutMetricValue>
          <span className="insight-editorial-metric-label">{card.heroLabel}</span>
        </div>
        {secondary ? (
          <div className="insight-editorial-metric">
            <StandoutMetricValue tone="neutral" size="md">
              {secondary.value}
            </StandoutMetricValue>
            <span className="insight-editorial-metric-label">{secondary.caption}</span>
          </div>
        ) : null}
      </div>

      <h3 className="refs-trend-spotlight-name">
        {card.entityHref && card.entityName ? (
          <Link href={card.entityHref} className="rankings-insight-name">
            {card.entityName}
          </Link>
        ) : (
          card.headline
        )}
      </h3>

      <p className={`${REF_CARD_BODY_CLASS} ${REF_CARD_METRIC_DETAIL_CLASS}`}>
        <StatComparison>{card.story}</StatComparison>
      </p>

      {card.stats.length > 0 ? (
        <dl className="refs-trend-spotlight-stats">
          {card.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <footer className="refs-trend-spotlight-footer">
        {card.links.map((link, linkIndex) => (
          <Link key={link.href} href={link.href} className="insight-card-link">
            {link.label}
            {linkIndex === 0 ? <ArrowRight aria-hidden /> : null}
          </Link>
        ))}
      </footer>
    </RefCard>
  );
}
