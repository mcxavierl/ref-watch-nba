"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import {
  DataCard,
  DataCardBody,
  DataCardFooter,
  DataCardHeader,
  DataCardHero,
  DataCardStats,
  Icon,
} from "@/components/design-system";
import { ArrowRight } from "lucide-react";
import type { LeagueInsightCard, LeagueInsightTone } from "@/lib/league-overview-insights";
import { leagueHubHref } from "@/lib/leagues";

const InsightDrilldownModal = dynamic(
  () =>
    import("@/components/InsightDrilldownModal").then(
      (mod) => mod.InsightDrilldownModal,
    ),
  { ssr: false },
);

function toneAttr(tone: LeagueInsightTone): "positive" | "negative" | "neutral" {
  if (tone === "positive") return "positive";
  if (tone === "negative") return "negative";
  return "neutral";
}

export type DashboardInsightStoryCardProps = {
  card: LeagueInsightCard;
  index?: number;
};

/**
 * Accessible "Four leagues, four stories" insight card built on the DataCard design system.
 */
export function DashboardInsightStoryCard({
  card,
  index = 0,
}: DashboardInsightStoryCardProps) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const drilldownEnabled = Boolean(card.drilldownId);

  return (
    <>
      <DataCard
        dataLeague={card.leagueId}
        interactive
        className={`overview-insight-card dashboard-insight-card${
          drilldownEnabled ? " overview-insight-card--drilldown" : ""
        }`}
        style={{ "--insight-index": index } as CSSProperties}
      >
        <DataCardHeader kicker={card.kicker}>
          <div className="overview-insight-league">
            <span className="overview-insight-league-mark" aria-hidden />
            <span className="overview-insight-league-label">{card.shortLabel}</span>
          </div>
        </DataCardHeader>

        <button
          type="button"
          className="overview-insight-drilldown-trigger rw-focus-ring"
          onClick={() => drilldownEnabled && setDrilldownOpen(true)}
          disabled={!drilldownEnabled}
          aria-haspopup={drilldownEnabled ? "dialog" : undefined}
          aria-expanded={drilldownOpen}
          aria-label={
            drilldownEnabled
              ? `Open historical drill-down for ${card.entityName ?? "official"} and ${card.teamLabel ?? "team"}`
              : undefined
          }
        >
          <DataCardHero
            value={card.heroValue}
            label={card.heroLabel}
            tone={toneAttr(card.heroTone)}
          />

          <DataCardBody
            headline={
              card.entityHref && card.entityName ? (
                <>
                  <Link
                    href={card.entityHref}
                    className="overview-insight-entity-link rw-focus-ring"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {card.entityName}
                  </Link>
                  {card.teamLabel ? (
                    <>
                      {" "}
                      <span className="overview-insight-team">× {card.teamLabel}</span>
                    </>
                  ) : null}
                </>
              ) : (
                card.headline
              )
            }
          >
            <p className="dashboard-insight-story overview-insight-story">{card.story}</p>
            {drilldownEnabled ? (
              <p className="overview-insight-drilldown-hint">
                Tap for last 10 games, home/away splits, and crew context
              </p>
            ) : null}
          </DataCardBody>
        </button>

        <DataCardStats stats={card.stats} />

        <DataCardFooter className="overview-insight-footer">
          {card.links.map((link, linkIndex) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rw-focus-ring ${
                linkIndex === 0
                  ? "overview-insight-link overview-insight-link--primary"
                  : "overview-insight-link"
              }`}
            >
              {link.label}
              {linkIndex === 0 ? <Icon icon={ArrowRight} tone="brand" size="1rem" /> : null}
            </Link>
          ))}
        </DataCardFooter>

        <Link
          href={leagueHubHref(card.leagueId)}
          className="overview-insight-card-cover rw-focus-ring"
          aria-label={`Open ${card.label} hub`}
        />
      </DataCard>

      {drilldownOpen ? (
        <InsightDrilldownModal
          card={card}
          open={drilldownOpen}
          onClose={() => setDrilldownOpen(false)}
        />
      ) : null}
    </>
  );
}
