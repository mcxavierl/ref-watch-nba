"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Flame,
  Globe2,
  Shield,
  Snowflake,
  Star,
  type LucideIcon,
} from "lucide-react";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { KpiDataPill } from "@/components/ui/KpiDataPill";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { leagueHubHref, type LeagueId } from "@/lib/leagues";
import "@/components/insight-card.css";

const InsightDrilldownModal = dynamic(
  () =>
    import("@/components/InsightDrilldownModal").then(
      (mod) => mod.InsightDrilldownModal,
    ),
  { ssr: false },
);

const STORY_ICONS: Partial<Record<LeagueId, LucideIcon>> = {
  nba: Flame,
  nfl: Shield,
  nhl: Snowflake,
  epl: Globe2,
  laliga: Star,
};

type InsightCardProps = {
  card: LeagueInsightCard;
  variant: "carousel" | "inline";
  index?: number;
  active?: boolean;
  className?: string;
};

/** Enforce spaced hyphens instead of em/en dashes in carousel copy. */
function normalizeCarouselCopy(text: string): string {
  return text.replace(/\u2014|\u2013/g, " - ");
}

function carouselMetaLabel(card: LeagueInsightCard): string {
  return normalizeCarouselCopy(`${card.shortLabel} ref×team split`);
}

function CarouselInsightCard({
  card,
  active,
  className,
}: {
  card: LeagueInsightCard;
  active: boolean;
  className?: string;
}) {
  const Icon = STORY_ICONS[card.leagueId] ?? Flame;
  const headline = card.entityName ? (
    <>
      {normalizeCarouselCopy(card.entityName)}
      {card.teamLabel ? (
        <span className="overview-top-story-team"> × {normalizeCarouselCopy(card.teamLabel)}</span>
      ) : null}
    </>
  ) : (
    normalizeCarouselCopy(card.headline)
  );

  return (
    <article
      className={`insight-card insight-card--carousel overview-top-story-card${
        active ? " overview-top-story-card--active" : ""
      }${className ? ` ${className}` : ""}`}
      data-league={card.leagueId}
      data-tone={card.heroTone}
      aria-hidden={!active}
    >
      <div className="overview-top-story-visual" aria-hidden>
        <Icon className="overview-top-story-icon" />
      </div>

      <div className="overview-top-story-copy">
        <header className="overview-top-story-meta">
          <span className="overview-top-story-meta-pill">
            <LeagueNavMark league={card.leagueId} />
            <span>{carouselMetaLabel(card)}</span>
          </span>
        </header>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="shrink-0 md:max-w-[11rem]">
            <p className="overview-top-story-hero m-0 flex flex-col gap-1 md:gap-0.5">
              <span className="overview-top-story-value">{card.heroValue}</span>
              <span className="overview-top-story-value-label">
                {normalizeCarouselCopy(card.heroLabel)}
              </span>
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="overview-top-story-headline">{headline}</h2>
            <p className="overview-top-story-body">{normalizeCarouselCopy(card.story)}</p>

            <div className="overview-top-story-actions">
              {card.links[0] ? (
                <Link href={card.links[0].href} className="overview-top-story-link">
                  {card.links[0].label}
                  <ArrowRight aria-hidden />
                </Link>
              ) : null}
              <Link
                href={leagueHubHref(card.leagueId)}
                className="overview-top-story-link overview-top-story-link--muted"
              >
                Open {card.shortLabel} hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function InlineInsightCard({
  card,
  index = 0,
  className,
}: {
  card: LeagueInsightCard;
  index?: number;
  className?: string;
}) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const drilldownEnabled = Boolean(card.drilldownId);

  function openDrilldown() {
    if (!drilldownEnabled) return;
    setDrilldownOpen(true);
  }

  return (
    <>
      <article
        className={`insight-card insight-card--inline${
          drilldownEnabled ? " insight-card--drilldown" : ""
        }${className ? ` ${className}` : ""}`}
        data-league={card.leagueId}
        style={{ "--insight-index": index } as CSSProperties}
      >
        <header className="insight-card-head">
          <span className="insight-card-league">{card.shortLabel}</span>
          <div className="flex flex-wrap items-center gap-2">
            <LeagueSeasonStartBadge leagueId={card.leagueId} />
            <p className="insight-card-kicker">{card.kicker}</p>
          </div>
        </header>

        <button
          type="button"
          className="insight-card-drilldown-trigger"
          onClick={openDrilldown}
          disabled={!drilldownEnabled}
          aria-haspopup={drilldownEnabled ? "dialog" : undefined}
          aria-expanded={drilldownEnabled ? drilldownOpen : undefined}
          aria-label={
            drilldownEnabled
              ? `Open historical drill-down for ${card.entityName ?? "official"} and ${card.teamLabel ?? "team"}`
              : undefined
          }
        >
          <KpiDataPill
            variant="block"
            value={card.heroValue}
            tone={card.heroTone}
            label={card.heroLabel}
          />

          <div className="mt-3">
            <h3 className="insight-card-headline">
              {card.entityHref && card.entityName ? (
                <>
                  <Link
                    href={card.entityHref}
                    className="insight-card-entity-link"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {card.entityName}
                  </Link>
                  {card.teamLabel ? (
                    <span className="insight-card-team"> × {card.teamLabel}</span>
                  ) : null}
                </>
              ) : (
                card.headline
              )}
            </h3>
            <p className="insight-card-story mt-2">{card.story}</p>
            {drilldownEnabled ? (
              <p className="insight-card-drilldown-hint">
                Tap for last 10 games, home/away splits, and crew context
              </p>
            ) : null}
          </div>
        </button>

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
            <Link
              key={link.href}
              href={link.href}
              className="insight-card-link"
            >
              {link.label}
              {linkIndex === 0 ? <ArrowRight aria-hidden /> : null}
            </Link>
          ))}
        </footer>
      </article>

      {drilldownEnabled ? (
        <InsightDrilldownModal
          card={card}
          open={drilldownOpen}
          onClose={() => setDrilldownOpen(false)}
        />
      ) : null}
    </>
  );
}

export const InsightCard = memo(function InsightCard({
  card,
  variant,
  index,
  active = true,
  className,
}: InsightCardProps) {
  if (variant === "carousel") {
    return (
      <CarouselInsightCard card={card} active={active} className={className} />
    );
  }

  return <InlineInsightCard card={card} index={index} className={className} />;
});
