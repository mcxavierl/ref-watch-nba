"use client";

import dynamic from "next/dynamic";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { KpiDataPill } from "@/components/ui/KpiDataPill";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { leagueHubHref } from "@/lib/leagues";

const InsightDrilldownModal = dynamic(
  () =>
    import("@/components/InsightDrilldownModal").then(
      (mod) => mod.InsightDrilldownModal,
    ),
  { ssr: false },
);

type OverviewInsightCardProps = {
  card: LeagueInsightCard;
  index: number;
};

export function OverviewInsightCard({ card, index }: OverviewInsightCardProps) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const drilldownEnabled = Boolean(card.drilldownId);

  function openDrilldown() {
    if (!drilldownEnabled) return;
    setDrilldownOpen(true);
  }

  return (
    <>
      <article
        className={`overview-insight-card relative overflow-hidden${
          drilldownEnabled ? " overview-insight-card--drilldown" : ""
        }`}
        data-league={card.leagueId}
        style={{ "--insight-index": index } as CSSProperties}
      >
        <header className="overview-insight-card-head">
          <div className="overview-insight-league">
            <span className="overview-insight-league-mark" aria-hidden />
            <span className="overview-insight-league-label">{card.shortLabel}</span>
          </div>
          <div className="overview-insight-card-meta">
            <LeagueSeasonStartBadge leagueId={card.leagueId} />
            <p className="overview-insight-kicker">{card.kicker}</p>
          </div>
        </header>

        <button
          type="button"
          className="overview-insight-drilldown-trigger"
          onClick={openDrilldown}
          disabled={!drilldownEnabled}
          aria-haspopup="dialog"
          aria-expanded={drilldownOpen}
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

          <div className="overview-insight-body">
            <h3 className="overview-insight-headline">
              {card.entityHref && card.entityName ? (
                <>
                  <PrefetchLink
                    href={card.entityHref}
                    className="overview-insight-entity-link"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {card.entityName}
                  </PrefetchLink>
                  {card.teamLabel ? (
                    <>
                      {" "}
                      <span className="overview-insight-team">× {card.teamLabel}</span>
                    </>
                  ) : null}
                </>
              ) : (
                card.headline
              )}
            </h3>
            <p className="overview-insight-story">{card.story}</p>
            {drilldownEnabled ? (
              <p className="overview-insight-drilldown-hint">
                Tap for last 10 games, home/away splits, and crew context
              </p>
            ) : null}
          </div>
        </button>

        {card.stats.length > 0 ? (
          <dl className="overview-insight-stats">
            {card.stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <footer className="overview-insight-footer">
          {card.links.map((link, linkIndex) => (
            <PrefetchLink
              key={link.href}
              href={link.href}
              className={
                linkIndex === 0
                  ? "overview-insight-link overview-insight-link--primary"
                  : "overview-insight-link"
              }
            >
              {link.label}
              {linkIndex === 0 ? <ArrowRight aria-hidden /> : null}
            </PrefetchLink>
          ))}
        </footer>

        <PrefetchLink
          href={leagueHubHref(card.leagueId)}
          className="overview-insight-card-cover"
          aria-label={`Open ${card.label} hub`}
        >
          <span className="sr-only">Open {card.label} hub</span>
        </PrefetchLink>
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
