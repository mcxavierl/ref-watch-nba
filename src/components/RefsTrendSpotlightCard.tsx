"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { InsightCardShell } from "@/components/shared/InsightCardShell";
import {
  KpiDataPill,
  type KpiDataPillAccent,
} from "@/components/ui/KpiDataPill";
import type {
  LeagueInsightCard,
  LeagueInsightTone,
} from "@/lib/league-overview-insights";
import "@/components/insight-card.css";

function toneToAccent(tone: LeagueInsightTone): KpiDataPillAccent | undefined {
  if (tone === "positive") return "emerald";
  if (tone === "negative") return "rose";
  return undefined;
}

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
  index: number;
};

export function RefsTrendSpotlightCard({
  card,
  index,
}: RefsTrendSpotlightCardProps) {
  const secondary = secondaryMetric(card);
  const accent = toneToAccent(card.heroTone);

  return (
    <InsightCardShell
      className="insight-card insight-card--inline refs-trend-spotlight-card"
      data-league={card.leagueId}
      data-tone={card.heroTone}
      style={{ "--insight-index": index } as CSSProperties}
    >
      <header className="insight-card-head">
        <span className="insight-card-league">{card.shortLabel}</span>
        <div className="flex flex-wrap items-center gap-2">
          <LeagueSeasonStartBadge leagueId={card.leagueId} />
          <p className="insight-card-kicker">{card.kicker}</p>
        </div>
      </header>

      <div className="refs-trend-spotlight-metrics">
        <KpiDataPill
          variant="compact"
          value={card.heroValue}
          caption={card.heroLabel}
          tone={card.heroTone}
          accent={accent}
          className="refs-trend-spotlight-metric refs-trend-spotlight-metric--primary"
        />
        {secondary ? (
          <KpiDataPill
            variant="compact"
            value={secondary.value}
            caption={secondary.caption}
            tone="neutral"
            metricPriority="secondary"
            className="refs-trend-spotlight-metric"
          />
        ) : null}
      </div>

      <h3 className="insight-card-headline">
        {card.entityHref && card.entityName ? (
          <Link href={card.entityHref} className="insight-card-entity-link">
            {card.entityName}
          </Link>
        ) : (
          card.headline
        )}
      </h3>

      <p className="insight-card-story">{card.story}</p>

      {card.stats.length > 0 ? (
        <dl className="insight-card-stats">
          {card.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <footer className="insight-card-footer">
        {card.links.map((link, linkIndex) => (
          <Link key={link.href} href={link.href} className="insight-card-link">
            {link.label}
            {linkIndex === 0 ? <ArrowRight aria-hidden /> : null}
          </Link>
        ))}
      </footer>
    </InsightCardShell>
  );
}
