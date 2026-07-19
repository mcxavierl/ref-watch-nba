"use client";

import { useMemo, useState } from "react";
import { GsniResearchTable } from "@/components/GsniResearchTable";
import { GsniResearchIntro } from "@/components/GsniResearchIntro";
import { Pill } from "@/components/ui/Pill";
import { NO_ANOMALIES_DETECTED_COPY } from "@/lib/anomaly-surface";
import {
  gsniQualifiesHighVariance,
  gsniResearchConfigForLeague,
} from "@/lib/gsni-research";
import type { GsniResearchRow } from "@/lib/gsni-research";
import type { InsightsLeagueId } from "@/lib/league-manifest";

export function GameStateIndexDashboard({
  rows,
  leagueId,
  compactHub = false,
}: {
  rows: GsniResearchRow[];
  leagueId: InsightsLeagueId;
  compactHub?: boolean;
}) {
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

  const filteredRows = useMemo(() => {
    if (!anomaliesOnly) return rows;
    return rows.filter((row) => row.highVariance);
  }, [anomaliesOnly, rows]);

  if (rows.length === 0) return null;

  const ratedCount = rows.filter((row) => row.gateCleared && row.gsni !== null).length;
  const gsniConfig = gsniResearchConfigForLeague(leagueId);
  const minHighLeverageMinutes = gsniConfig?.minHighLeverageMinutes ?? 50;
  const anomalyCount = rows.filter(
    (row) => row.gsni !== null && gsniQualifiesHighVariance(row.gsni),
  ).length;

  return (
    <>
      <GsniResearchIntro
        leagueId={leagueId}
        ratedCount={ratedCount}
        trackedCount={rows.length}
      />

      <section className="section-block" id="gsni-official-table">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title m-0">Game-State Index official table</h2>
          <Pill
            as="button"
            variant="insight"
            active={anomaliesOnly}
            onClick={() => setAnomaliesOnly((current) => !current)}
            aria-pressed={anomaliesOnly}
          >
            Anomalies only
          </Pill>
        </div>
        {!compactHub ? (
          <p className="gsni-sub-text section-lead mb-3">
            {leagueId === "nfl"
              ? "Single source of truth for penalty frequency in high-leverage states vs league average."
              : "Single source of truth for foul frequency in high-leverage states vs league average."}
          </p>
        ) : null}
        <p className="gsni-sub-text mb-3">
          {filteredRows.length} official{filteredRows.length === 1 ? "" : "s"} shown
          {anomaliesOnly ? " (anomalies filter on)" : ""}
          {!anomaliesOnly && anomalyCount > 0
            ? ` · ${anomalyCount} extreme anomal${anomalyCount === 1 ? "y" : "ies"} in Top highlights`
            : ""}
          .
        </p>
        {filteredRows.length > 0 ? (
          <GsniResearchTable
            rows={filteredRows}
            minHighLeverageMinutes={minHighLeverageMinutes}
          />
        ) : (
          <p className="gsni-sub-text">{NO_ANOMALIES_DETECTED_COPY}</p>
        )}
      </section>
    </>
  );
}
