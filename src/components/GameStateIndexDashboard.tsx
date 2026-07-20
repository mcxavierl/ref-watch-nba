"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GsniCard } from "@/components/GsniCard";
import { GsniCorrelationPill } from "@/components/GsniCorrelationPill";
import { GsniResearchTable } from "@/components/GsniResearchTable";
import { GsniScoreBlock } from "@/components/GsniScoreBlock";
import { GsniResearchIntro } from "@/components/GsniResearchIntro";
import { Pill } from "@/components/ui/Pill";
import { TermHelp } from "@/components/TermHelp";
import { NO_ANOMALIES_DETECTED_COPY } from "@/lib/anomaly-surface";
import { gsniInsightSummary } from "@/lib/gsni-display";
import { gsniQualifiesHighVariance } from "@/lib/gsni-research";
import type { GsniResearchHighlight, GsniResearchRow } from "@/lib/gsni-research";
import type { InsightsLeagueId } from "@/lib/league-manifest";

function HighlightCard({ finding }: { finding: GsniResearchHighlight }) {
  return (
    <GsniCard className="gsni-research-highlight gsni-research-highlight--card h-full">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="gsni-gauge-label m-0 min-w-0 truncate">
          {gsniInsightSummary(finding.gsni!)}
        </p>
        <GsniCorrelationPill score={finding.gsni!} />
      </div>
      <Link
        href={finding.href}
        className="gsni-official-link mt-2 block truncate text-base font-semibold hover:underline"
      >
        {finding.refName}
      </Link>
      <Link
        href={finding.gameStateHref}
        className="mt-3 block transition-[border-color,box-shadow] hover:opacity-95"
      >
        <GsniScoreBlock score={finding.gsni!} compact showPill={false} />
      </Link>
      <p className="gsni-sub-text mt-2">
        N={finding.sampleGames} games ·{" "}
        {Math.round(finding.highLeverageMinutes)} high-leverage min
      </p>
    </GsniCard>
  );
}

export function GameStateIndexDashboard({
  highlights,
  rows,
  leagueId,
  compactHub = false,
}: {
  highlights: GsniResearchHighlight[];
  rows: GsniResearchRow[];
  leagueId: InsightsLeagueId;
  compactHub?: boolean;
}) {
  const [highVarianceOnly, setHighVarianceOnly] = useState(false);

  const filteredHighlights = useMemo(() => {
    if (!highVarianceOnly) return highlights;
    return highlights.filter(
      (finding) =>
        finding.gsni !== null && gsniQualifiesHighVariance(finding.gsni),
    );
  }, [highVarianceOnly, highlights]);

  const filteredRows = useMemo(() => {
    if (!highVarianceOnly) return rows;
    return rows.filter((row) => row.highVariance);
  }, [highVarianceOnly, rows]);

  if (rows.length === 0) return null;

  const ratedCount = rows.filter((row) => row.gateCleared && row.gsni !== null).length;

  return (
    <>
      <GsniResearchIntro
        leagueId={leagueId}
        ratedCount={ratedCount}
        trackedCount={rows.length}
      />

      {highlights.length > 0 ? (
        <section className="section-block">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title m-0">
              <TermHelp id="game-state-index">Game-State Index highlights</TermHelp>
            </h2>
            <Pill
              as="button"
              variant="insight"
              active={highVarianceOnly}
              onClick={() => setHighVarianceOnly((current) => !current)}
              aria-pressed={highVarianceOnly}
            >
              Anomalies only
            </Pill>
          </div>
          {filteredHighlights.length > 0 ? (
            <div className="rankings-insight-grid">
              {filteredHighlights.map((finding) => (
                <HighlightCard key={finding.refSlug} finding={finding} />
              ))}
            </div>
          ) : (
            <p className="gsni-sub-text">{NO_ANOMALIES_DETECTED_COPY}</p>
          )}
        </section>
      ) : null}

      <section className="section-block" id="gsni-official-table">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title m-0">Game-State Index official table</h2>
          {compactHub ? (
            <Pill
              as="button"
              variant="insight"
              active={highVarianceOnly}
              onClick={() => setHighVarianceOnly((current) => !current)}
              aria-pressed={highVarianceOnly}
            >
              Anomalies only
            </Pill>
          ) : null}
        </div>
        {!compactHub ? (
          <p className="gsni-sub-text section-lead">
            {leagueId === "nfl"
              ? "Penalty frequency in high-leverage states vs league average."
              : "Foul frequency in high-leverage states vs league average."}
          </p>
        ) : null}
        <p className="gsni-sub-text mb-3">
          {filteredRows.length} official{filteredRows.length === 1 ? "" : "s"} shown
          {highVarianceOnly ? " (anomalies filter on)" : ""}.
        </p>
        {filteredRows.length > 0 ? (
          <GsniResearchTable rows={filteredRows} />
        ) : (
          <p className="gsni-sub-text">{NO_ANOMALIES_DETECTED_COPY}</p>
        )}
      </section>
    </>
  );
}
