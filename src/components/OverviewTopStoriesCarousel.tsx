"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Globe2,
  Shield,
  Snowflake,
  Star,
  type LucideIcon,
} from "lucide-react";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { leagueHubHref, type LeagueId } from "@/lib/leagues";

const STORY_LIMIT = 3;

const STORY_ICONS: Partial<Record<LeagueId, LucideIcon>> = {
  nba: Flame,
  nfl: Shield,
  nhl: Snowflake,
  epl: Globe2,
  laliga: Star,
};

type OverviewTopStoriesCarouselProps = {
  cards: LeagueInsightCard[];
};

export function OverviewTopStoriesCarousel({ cards }: OverviewTopStoriesCarouselProps) {
  const stories = cards.slice(0, STORY_LIMIT);
  const [activeIndex, setActiveIndex] = useState(0);
  const storyCount = stories.length;

  const goTo = useCallback(
    (index: number) => {
      if (storyCount === 0) return;
      setActiveIndex(((index % storyCount) + storyCount) % storyCount);
    },
    [storyCount],
  );

  useEffect(() => {
    if (storyCount <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % storyCount);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [storyCount]);

  if (storyCount === 0) return null;

  const activeStory = stories[activeIndex]!;
  const primaryLink = activeStory.links[0];

  return (
    <section
      className="overview-top-stories section-block"
      aria-labelledby="overview-top-stories-heading"
      aria-roledescription="carousel"
    >
      <div className="overview-top-stories-head">
        <div>
          <p className="overview-eyebrow">Top stories</p>
          <h1 className="overview-title" id="overview-top-stories-heading">
            Live whistle edges worth watching
          </h1>
          <p className="overview-lead overview-lead--stories">
            Three high-confidence patterns from verified leagues — refreshed from the latest
            ref×team matrix and outlier scans.
          </p>
        </div>
        {storyCount > 1 ? (
          <div className="overview-top-stories-controls">
            <button
              type="button"
              className="overview-top-stories-nav"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous story"
            >
              <ChevronLeft aria-hidden />
            </button>
            <button
              type="button"
              className="overview-top-stories-nav"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next story"
            >
              <ChevronRight aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <div className="overview-top-stories-track">
        {stories.map((card, index) => {
          const Icon = STORY_ICONS[card.leagueId] ?? Flame;
          const isActive = index === activeIndex;

          return (
            <article
              key={card.leagueId}
              className={`overview-top-story-card${isActive ? " overview-top-story-card--active" : ""}`}
              data-league={card.leagueId}
              data-tone={card.heroTone}
              aria-hidden={!isActive}
            >
              <div className="overview-top-story-visual" aria-hidden>
                <Icon className="overview-top-story-icon" />
              </div>

              <div className="overview-top-story-copy">
                <header className="overview-top-story-meta">
                  <span className="overview-top-story-league">{card.shortLabel}</span>
                  <LeagueSeasonStartBadge leagueId={card.leagueId} />
                  <span className="overview-top-story-kicker">{card.kicker}</span>
                </header>

                <p className="overview-top-story-hero">
                  <span className="overview-top-story-value">{card.heroValue}</span>
                  <span className="overview-top-story-value-label">{card.heroLabel}</span>
                </p>

                <h2 className="overview-top-story-headline">
                  {card.entityName ? (
                    <>
                      {card.entityName}
                      {card.teamLabel ? (
                        <span className="overview-top-story-team"> × {card.teamLabel}</span>
                      ) : null}
                    </>
                  ) : (
                    card.headline
                  )}
                </h2>

                <p className="overview-top-story-body">{card.story}</p>

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
            </article>
          );
        })}
      </div>

      {storyCount > 1 ? (
        <div className="overview-top-stories-dots" role="tablist" aria-label="Story slides">
          {stories.map((card, index) => (
            <button
              key={card.leagueId}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Story ${index + 1}: ${card.shortLabel}`}
              className={`overview-top-stories-dot${index === activeIndex ? " overview-top-stories-dot--active" : ""}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      ) : null}

      {primaryLink ? (
        <p className="sr-only">
          Active story: {activeStory.headline}. {primaryLink.label}.
        </p>
      ) : null}
    </section>
  );
}
