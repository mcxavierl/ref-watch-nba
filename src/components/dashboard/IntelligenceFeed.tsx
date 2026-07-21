"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  IntelligenceFeedCategory,
  IntelligenceFeedEvent,
} from "@/lib/homepage-intelligence";
import "@/components/dashboard/intelligence-dashboard.css";

const FILTERS: { id: IntelligenceFeedCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "anomalies", label: "Anomalies" },
  { id: "assignments", label: "Assignments" },
  { id: "projections", label: "Projections" },
];

type IntelligenceFeedProps = {
  events: IntelligenceFeedEvent[];
};

export function IntelligenceFeed({ events }: IntelligenceFeedProps) {
  const [activeFilter, setActiveFilter] = useState<IntelligenceFeedCategory>("all");

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    return events.filter((event) => event.category === activeFilter);
  }, [activeFilter, events]);

  const hasAnomalies = events.some((event) => event.category === "anomalies");
  const statusTone = hasAnomalies ? "amber" : "emerald";

  if (events.length === 0) return null;

  return (
    <section
      className="intelligence-feed section-block overview-section--secondary"
      aria-labelledby="intelligence-feed-heading"
    >
      <div className="intelligence-feed-header">
        <div className="intelligence-feed-title-row">
          <h2 className="overview-section-title" id="intelligence-feed-heading">
            Live Intelligence Feed
          </h2>
          <span
            className={`intelligence-feed-status intelligence-feed-status--${statusTone}`}
            role="status"
          >
            <span className="intelligence-feed-status-dot" aria-hidden />
            Streaming
          </span>
        </div>

        <div className="intelligence-feed-filters" role="tablist" aria-label="Feed filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.id}
              className={`intelligence-feed-filter${
                activeFilter === filter.id ? " intelligence-feed-filter--active" : ""
              }`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="intelligence-feed-terminal"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {filteredEvents.length > 0 ? (
          <ul className="intelligence-feed-list">
            {filteredEvents.map((event) => (
              <li key={event.id} className="intelligence-feed-item">
                <span className="intelligence-feed-time">{event.timeLabel}</span>
                <span className="intelligence-feed-sep" aria-hidden>
                  -
                </span>
                {event.href ? (
                  <Link href={event.href} className="intelligence-feed-message">
                    {event.message}
                  </Link>
                ) : (
                  <span className="intelligence-feed-message">{event.message}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="intelligence-feed-empty">
            No {activeFilter} events in the current window.
          </p>
        )}
      </div>
    </section>
  );
}
