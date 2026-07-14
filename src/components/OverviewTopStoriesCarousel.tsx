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
import type { TopStoriesStatus } from "@/lib/insights/generator";
import { leagueHubHref, type LeagueId } from "@/lib/leagues";

const STORY_LIMIT = 3;
const INSIGHTS_PUBLIC_PATH = "/data/insights.json";

const STORY_ICONS: Partial<Record<LeagueId, LucideIcon>> = {
  nba: Flame,
  nfl: Shield,
  nhl: Snowflake,
  epl: Globe2,
  laliga: Star,
};

type InsightsJsonPayload = {
  topStories?: LeagueInsightCard[];
  topStoriesStatus?: TopStoriesStatus;
  cards?: LeagueInsightCard[];
};

type CarouselPhase = "loading" | "ready" | "fallback";

type OverviewTopStoriesCarouselProps = {
  cards: LeagueInsightCard[];
  status?: TopStoriesStatus;
  generatedAt?: string | null;
};

function resolvePhase(status: TopStoriesStatus | undefined, storyCount: number): CarouselPhase {
  if (storyCount === 0) return "loading";
  if (status === "fallback") return "fallback";
  return "ready";
}

function StorySkeleton() {
  return (
    <article
      className="overview-top-story-card overview-top-story-card--active overview-top-story-card--skeleton"
      aria-hidden
    >
      <div className="overview-top-story-visual overview-top-story-skeleton-block" />
      <div className="overview-top-story-copy">
        <div className="overview-top-story-skeleton-line overview-top-story-skeleton-line--short" />
        <div className="overview-top-story-skeleton-line overview-top-story-skeleton-line--hero" />
        <div className="overview-top-story-skeleton-line" />
        <div className="overview-top-story-skeleton-line overview-top-story-skeleton-line--body" />
      </div>
    </article>
  );
}

export function OverviewTopStoriesCarousel({
  cards: initialCards,
  status: initialStatus,
  generatedAt,
}: OverviewTopStoriesCarouselProps) {
  const [cards, setCards] = useState(initialCards.slice(0, STORY_LIMIT));
  const [status, setStatus] = useState<TopStoriesStatus | undefined>(initialStatus);
  const [phase, setPhase] = useState<CarouselPhase>(() =>
    resolvePhase(initialStatus, initialCards.length),
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setCards(initialCards.slice(0, STORY_LIMIT));
    setStatus(initialStatus);
    setPhase(resolvePhase(initialStatus, initialCards.length));
  }, [initialCards, initialStatus]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refreshFromPublicCache() {
      try {
        const response = await fetch(INSIGHTS_PUBLIC_PATH, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as InsightsJsonPayload;
        if (cancelled) return;

        const nextStories = payload.topStories ?? payload.cards?.slice(0, STORY_LIMIT) ?? [];
        if (nextStories.length === 0) return;

        setCards(nextStories.slice(0, STORY_LIMIT));
        setStatus(payload.topStoriesStatus ?? "generated");
        setPhase(resolvePhase(payload.topStoriesStatus, nextStories.length));
        setActiveIndex(0);
      } catch {
        // Keep SSR bundle on network failure.
      }
    }

    void refreshFromPublicCache();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [generatedAt]);

  const stories = cards.slice(0, STORY_LIMIT);
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

  const showSkeleton = phase === "loading" && storyCount === 0;
  const activeStory = stories[activeIndex];
  const primaryLink = activeStory?.links[0];

  return (
    <section
      className="overview-top-stories section-block"
      aria-labelledby="overview-top-stories-heading"
      aria-roledescription="carousel"
      data-carousel-phase={phase}
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
          {phase === "fallback" ? (
            <p className="overview-top-stories-fallback-note" role="status">
              Showing evergreen context while the latest ingest cycle produces new outliers.
            </p>
          ) : null}
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
        {showSkeleton ? <StorySkeleton /> : null}

        {stories.map((card, index) => {
          const Icon = STORY_ICONS[card.leagueId] ?? Flame;
          const isActive = index === activeIndex;

          return (
            <article
              key={`${card.leagueId}-${card.refSlug ?? card.headline}-${index}`}
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
              key={`${card.leagueId}-dot-${index}`}
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

      {primaryLink && activeStory ? (
        <p className="sr-only">
          Active story: {activeStory.headline}. {primaryLink.label}.
          {status === "fallback" ? " Fallback content." : ""}
        </p>
      ) : null}
    </section>
  );
}
