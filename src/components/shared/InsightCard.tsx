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
import { InsightSplitMetrics } from "@/components/shared/InsightSplitMetrics";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import {
  editorialInsightView,
  insightMetricComparison,
  parseGamesFromCard,
} from "@/lib/insight-editorial";
import {
  homepageInsightKicker,
} from "@/lib/homepage-insight-gates";
import { leagueHubHref, type LeagueId } from "@/lib/leagues";
import { whistleIndexFromInsightCard } from "@/lib/whistle-index";
import { STANDOUT_SPLIT_FOOTNOTE } from "@/lib/data-maturity";
import { InsightCardShell } from "@/components/shared/InsightCardShell";
import { InsightMetricComparison } from "@/components/shared/InsightMetricComparison";
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
  variant: "carousel" | "inline" | "featured" | "trend" | "quick";
  index?: number;
  active?: boolean;
  className?: string;
  showHubLink?: boolean;
};

/** Enforce spaced hyphens instead of em/en dashes in carousel copy. */
function normalizeCarouselCopy(text: string): string {
  return text.replace(/\u2014|\u2013/g, " - ");
}

function carouselMetaLabel(card: LeagueInsightCard): string {
  return normalizeCarouselCopy(`${card.shortLabel} ref×team split`);
}

function comparisonImpactTone(
  comparison: NonNullable<ReturnType<typeof insightMetricComparison>>,
): "positive" | "negative" | "neutral" {
  if (comparison.deltaPp !== undefined) {
    if (comparison.deltaPp > 0) return "positive";
    if (comparison.deltaPp < 0) return "negative";
    return "neutral";
  }
  if (comparison.crewValue > comparison.leagueValue) return "positive";
  if (comparison.crewValue < comparison.leagueValue) return "negative";
  return "neutral";
}

function InsightHonestyFootnote({
  editorial,
}: {
  editorial: ReturnType<typeof editorialInsightView>;
}) {
  if (!editorial.showHonestyFootnote && !editorial.isPreliminary) return null;

  return (
    <p className="data-honesty-footnote insight-editorial-footnote">
      {STANDOUT_SPLIT_FOOTNOTE}
    </p>
  );
}

function InsightCardMeta({
  card,
  compact = false,
}: {
  card: LeagueInsightCard;
  compact?: boolean;
}) {
  const comparison = insightMetricComparison(card);
  const editorial = editorialInsightView(card);

  return (
    <div className="insight-card-meta">
      {comparison ? (
        <InsightMetricComparison
          comparison={comparison}
          compact={compact}
          crewImpactTone={comparisonImpactTone(comparison)}
          isAdjusted={editorial.isAdjusted}
          sampleGames={parseGamesFromCard(card)}
        />
      ) : null}
    </div>
  );
}

function CarouselInsightCard({
  card,
  active,
  className,
  showHubLink = true,
}: {
  card: LeagueInsightCard;
  active: boolean;
  className?: string;
  showHubLink?: boolean;
}) {
  const Icon = STORY_ICONS[card.leagueId] ?? Flame;
  const editorial = editorialInsightView(card);

  return (
    <InsightCardShell
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
              <span className="overview-top-story-value">{editorial.primaryMetric.value}</span>
              <span className="overview-top-story-value-label">
                {normalizeCarouselCopy(editorial.primaryMetric.label)}
              </span>
            </p>
            {editorial.secondaryMetric ? (
              <p className="overview-top-story-secondary m-0 mt-2 flex flex-col gap-0.5">
                <span className="overview-top-story-secondary-value">
                  {editorial.secondaryMetric.value}
                </span>
                <span className="overview-top-story-secondary-label">
                  {normalizeCarouselCopy(editorial.secondaryMetric.label)}
                </span>
              </p>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="overview-top-story-headline">{editorial.headline}</h2>
            <p className="overview-top-story-body insight-editorial-why">
              {editorial.whyItMatters}
            </p>

            <InsightCardMeta card={card} />

            <InsightHonestyFootnote editorial={editorial} />

            <div className="overview-top-story-actions">
              {card.links[0] ? (
                <Link href={card.links[0].href} className="overview-top-story-link">
                  {card.links[0].label}
                  <ArrowRight aria-hidden />
                </Link>
              ) : null}
              {showHubLink ? (
                <Link
                  href={leagueHubHref(card.leagueId)}
                  className="overview-top-story-link overview-top-story-link--muted"
                >
                  Open {card.shortLabel} hub
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </InsightCardShell>
  );
}

function EditorialInsightCard({
  card,
  variant,
  index = 0,
  className,
  showHubLink = true,
}: {
  card: LeagueInsightCard;
  variant: "featured" | "trend" | "quick";
  index?: number;
  className?: string;
  showHubLink?: boolean;
}) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const drilldownEnabled = Boolean(card.drilldownId);
  const editorial = editorialInsightView(card);
  const primaryLink = card.links[0];
  const whistleIndex =
    variant === "featured" ? whistleIndexFromInsightCard(card) : null;
  const metaCompact = variant === "quick";

  function openDrilldown() {
    if (!drilldownEnabled) return;
    setDrilldownOpen(true);
  }

  return (
    <>
      <InsightCardShell
        className={`insight-card insight-card--${variant} insight-card--editorial${
          drilldownEnabled ? " insight-card--drilldown" : ""
        }${className ? ` ${className}` : ""}`}
        data-league={card.leagueId}
        data-tone={card.heroTone}
        style={{ "--insight-index": index } as CSSProperties}
      >
        <header className="insight-editorial-head">
          <div className="insight-editorial-head-row">
            <span className="insight-editorial-league">
              <LeagueNavMark league={card.leagueId} />
              <span>{card.shortLabel}</span>
            </span>
            {variant !== "trend" ? (
              <LeagueSeasonStartBadge leagueId={card.leagueId} />
            ) : null}
          </div>
          <p className="insight-editorial-kicker">
            {normalizeCarouselCopy(homepageInsightKicker(card))}
          </p>
        </header>

        <button
          type="button"
          className="insight-editorial-body-trigger"
          onClick={openDrilldown}
          disabled={!drilldownEnabled}
          aria-haspopup={drilldownEnabled ? "dialog" : undefined}
          aria-expanded={drilldownEnabled ? drilldownOpen : undefined}
        >
          <h2 className="insight-editorial-headline">{editorial.headline}</h2>

          {whistleIndex !== null ? (
            <WhistleIndexGauge index={whistleIndex} size="lg" className="insight-editorial-whistle-index" />
          ) : null}

          {card.kind === "matrix-edge" ? (
            <InsightSplitMetrics
              deltaMetric={editorial.primaryMetric}
              compact={metaCompact}
            />
          ) : (
            <div className="insight-editorial-metrics">
              <div className="insight-editorial-metric insight-editorial-metric--primary">
                <span className="insight-editorial-metric-value">{editorial.primaryMetric.value}</span>
                <span className="insight-editorial-metric-label">
                  {normalizeCarouselCopy(editorial.primaryMetric.label)}
                </span>
              </div>
              {editorial.secondaryMetric ? (
                <div className="insight-editorial-metric insight-editorial-metric--secondary">
                  <span className="insight-editorial-metric-value">
                    {editorial.secondaryMetric.value}
                  </span>
                  <span className="insight-editorial-metric-label">
                    {normalizeCarouselCopy(editorial.secondaryMetric.label)}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          <InsightCardMeta card={card} compact={metaCompact} />

          <InsightHonestyFootnote editorial={editorial} />

          <p className="insight-editorial-why">{editorial.whyItMatters}</p>
        </button>

        <footer className="insight-editorial-footer">
          {primaryLink ? (
            <Link href={primaryLink.href} className="insight-editorial-link">
              {primaryLink.label}
              <ArrowRight aria-hidden />
            </Link>
          ) : null}
          {showHubLink ? (
            <Link
              href={leagueHubHref(card.leagueId)}
              className="insight-editorial-link insight-editorial-link--muted"
            >
              Open {card.shortLabel} hub
            </Link>
          ) : null}
        </footer>
      </InsightCardShell>

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
  const editorial = editorialInsightView(card);

  function openDrilldown() {
    if (!drilldownEnabled) return;
    setDrilldownOpen(true);
  }

  return (
    <>
      <InsightCardShell
        className={`insight-card insight-card--inline${
          drilldownEnabled ? " insight-card--drilldown" : ""
        }${className ? ` ${className}` : ""}`}
        data-league={card.leagueId}
        style={{ "--insight-index": index } as CSSProperties}
      >
        <header className="insight-card-head">
          <div className="insight-card-head-row">
            <span className="insight-card-league">{card.shortLabel}</span>
            <LeagueSeasonStartBadge leagueId={card.leagueId} />
          </div>
          <p className="insight-card-kicker">{card.kicker}</p>
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
            value={editorial.primaryMetric.value}
            tone={card.heroTone}
            label={editorial.primaryMetric.label}
          />
          {editorial.secondaryMetric ? (
            <div className="insight-inline-secondary-metric mt-2">
              <KpiDataPill
                variant="block"
                value={editorial.secondaryMetric.value}
                tone={card.heroTone}
                label={editorial.secondaryMetric.label}
                metricPriority="secondary"
              />
            </div>
          ) : null}

          <InsightCardMeta card={card} compact />

          <InsightHonestyFootnote editorial={editorial} />

          <div className="mt-3">
            <h3 className="insight-card-headline">{editorial.headline}</h3>
            <p className="insight-card-story mt-2 insight-editorial-why">
              {editorial.whyItMatters}
            </p>
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
      </InsightCardShell>

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
  showHubLink = true,
}: InsightCardProps) {
  if (variant === "featured" || variant === "trend" || variant === "quick") {
    return (
      <EditorialInsightCard
        card={card}
        variant={variant}
        index={index}
        className={className}
        showHubLink={showHubLink}
      />
    );
  }

  if (variant === "carousel") {
    return (
      <CarouselInsightCard
        card={card}
        active={active}
        className={className}
        showHubLink={showHubLink}
      />
    );
  }

  return <InlineInsightCard card={card} index={index} className={className} />;
});
