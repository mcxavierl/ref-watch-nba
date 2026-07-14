"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InsightCard } from "@/components/shared/InsightCard";
import { useInsights } from "@/hooks/useInsights";
import type { InsightsQueryResult } from "@/lib/insights/insights-query";

const STORY_LIMIT = 3;

type CarouselPhase = "loading" | "ready" | "fallback";

type OverviewTopStoriesCarouselProps = {
  initialData: InsightsQueryResult;
};

function resolvePhase(status: InsightsQueryResult["status"], storyCount: number): CarouselPhase {
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

export function OverviewTopStoriesCarousel({ initialData }: OverviewTopStoriesCarouselProps) {
  const { insights, status, generatedAt } = useInsights({
    initialData,
    limit: STORY_LIMIT,
  });
  const [phase, setPhase] = useState<CarouselPhase>(() =>
    resolvePhase(initialData.status, initialData.insights.length),
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setPhase(resolvePhase(status, insights.length));
  }, [insights, status]);

  useEffect(() => {
    setActiveIndex(0);
  }, [generatedAt]);

  const stories = useMemo(() => insights.slice(0, STORY_LIMIT), [insights]);
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
            Three high-confidence patterns from verified leagues, refreshed from the latest
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

        {stories.map((card, index) => (
          <InsightCard
            key={`${card.leagueId}-${card.refSlug ?? card.headline}-${index}`}
            card={card}
            variant="carousel"
            index={index}
            active={index === activeIndex}
          />
        ))}
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
