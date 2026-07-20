"use client";

import { useMemo, useState } from "react";
import { SeasonTrendsTable } from "@/components/ref-profile/SeasonTrendsTable";
import { Pill } from "@/components/ui/Pill";
import {
  buildSeasonTrendRows,
  hasSeasonTrendData,
  type SeasonTrendView,
} from "@/lib/ref-profile-season-trends";
import type { RefProfile } from "@/lib/types";
import "./season-trends.css";

export function RefProfileCareerEvolution({
  profile,
}: {
  profile: Pick<RefProfile, "officialStatsBySeason">;
}) {
  const [view, setView] = useState<SeasonTrendView>("recent");

  const rows = useMemo(
    () => buildSeasonTrendRows(profile.officialStatsBySeason, view),
    [profile.officialStatsBySeason, view],
  );

  if (!hasSeasonTrendData(profile.officialStatsBySeason)) {
    return null;
  }

  return (
    <section
      className="ref-profile-section ref-career-evolution"
      aria-labelledby="ref-career-evolution-heading"
    >
      <div className="ref-career-evolution-head">
        <div>
          <h2 id="ref-career-evolution-heading" className="ref-profile-section-title">
            Career Evolution
          </h2>
          <p className="ref-career-evolution-lead">
            Season-by-season archetype, foul mix, leverage sensitivity, and consistency trends.
          </p>
        </div>
        <div
          className="ref-career-evolution-toggle"
          role="tablist"
          aria-label="Season trend range"
        >
          <Pill
            as="button"
            type="button"
            variant="insight"
            active={view === "recent"}
            onClick={() => setView("recent")}
            aria-pressed={view === "recent"}
          >
            Recent Trends
          </Pill>
          <Pill
            as="button"
            type="button"
            variant="insight"
            active={view === "all"}
            onClick={() => setView("all")}
            aria-pressed={view === "all"}
          >
            All Seasons
          </Pill>
        </div>
      </div>

      <SeasonTrendsTable rows={rows} />
    </section>
  );
}
