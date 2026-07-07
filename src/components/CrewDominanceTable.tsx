"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  CREW_DOMINANCE_SORT_OPTIONS,
  sortCrewDominance,
  type CrewDominanceEntry,
  type CrewDominanceSort,
} from "@/lib/crew-dominance";
import { deltaTone } from "@/lib/metricTone";
import type { LeagueId } from "@/lib/leagues";

function deltaClass(value: number, threshold = 0): string {
  const tone = deltaTone(value, threshold);
  if (tone === "positive") return "ref-delta-positive";
  if (tone === "negative") return "ref-delta-negative";
  return "";
}

export function CrewDominanceTable({
  entries,
  basePath,
  league,
  overBaseline,
  leagueAvgFouls,
}: {
  entries: CrewDominanceEntry[];
  basePath: string;
  league: LeagueId;
  overBaseline: number;
  leagueAvgFouls: number;
}) {
  const [sort, setSort] = useState<CrewDominanceSort>("games-desc");
  const sport = league === "nhl" ? "nhl" : "nba";
  const scoreUnit = league === "nhl" ? "goals" : "points";
  const whistleLabel = league === "nhl" ? "PIM" : "fouls";

  const sorted = useMemo(
    () => sortCrewDominance(entries, sort),
    [entries, sort],
  );

  if (entries.length === 0) {
    return (
      <div className="panel-inset px-6 py-8 text-center">
        <p className="text-base font-medium text-zinc-800">
          No qualifying crews in this dataset yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
          Crew rows need enough combined games across team splits before they
          appear here. Check back after the next data refresh.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="ranking-toolbar">
        <div className="ranking-toolbar-row">
          <p className="ranking-toolbar-hint">
            Recurring officiating crews aggregated from team splits. Dominance
            compares each crew&apos;s combined pace and whistle rate to the same
            members&apos; averages in other crew pairings. Historical only, not
            picks.
          </p>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <span className="font-medium">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CrewDominanceSort)}
              className="rounded-md border border-border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
            >
              {CREW_DOMINANCE_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="ranking-toolbar-context">
          League baseline: {overBaseline} combined {scoreUnit} over benchmark ·{" "}
          {leagueAvgFouls} avg {whistleLabel}/game
        </p>
      </div>

      <div className="ranking-table-wrap overflow-x-auto">
        <table className="data-table ranking-table min-w-[720px]">
          <thead>
            <tr className="data-table-head">
              <th className="data-table-rank">#</th>
              <th>Crew</th>
              <th className="data-table-num">Games</th>
              <th className="data-table-num">Pace</th>
              <th className="data-table-num">Scoring Δ</th>
              <th className="data-table-num">{whistleLabel} Δ</th>
              <th className="data-table-num">Over rate</th>
              <th className="data-table-num">Dominance</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, index) => (
              <tr key={entry.crewKey} className="data-table-row">
                <td className="data-table-rank font-mono text-xs text-zinc-500">
                  {index + 1}
                </td>
                <td>
                  <div className="flex flex-col gap-2 py-1">
                    <div className="flex flex-wrap gap-1.5">
                      {entry.memberSlugs.map((slug, i) => (
                        <Link
                          key={slug}
                          href={`${basePath}/refs/${slug}#close-game`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                        >
                          <RefAvatar
                            name={entry.crewNames[i] ?? slug}
                            slug={slug}
                            sport={sport}
                            size="sm"
                          />
                          {entry.crewNames[i] ?? slug}
                        </Link>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {entry.teamCount} teams in sample
                    </p>
                  </div>
                </td>
                <td className="data-table-num font-mono text-sm tabular-nums">
                  {entry.games}
                </td>
                <td className="data-table-num font-mono text-sm tabular-nums">
                  {entry.avgTotalPoints}
                </td>
                <td
                  className={`data-table-num font-mono text-sm tabular-nums ${deltaClass(entry.scoringDelta, 1.5)}`.trim()}
                >
                  {formatSigned(entry.scoringDelta)}
                </td>
                <td
                  className={`data-table-num font-mono text-sm tabular-nums ${deltaClass(entry.whistleDelta, 0.8)}`.trim()}
                >
                  {formatSigned(entry.whistleDelta)}
                </td>
                <td className="data-table-num font-mono text-sm tabular-nums">
                  {formatPct(entry.overRate)}
                </td>
                <td className="data-table-num text-xs leading-relaxed text-zinc-700">
                  {entry.dominanceScoringDelta !== null ? (
                    <span
                      className={`block font-mono tabular-nums ${deltaClass(entry.dominanceScoringDelta, 1)}`.trim()}
                    >
                      Pace {formatSigned(entry.dominanceScoringDelta)}
                    </span>
                  ) : (
                    <span className="block text-zinc-400">Pace n/a</span>
                  )}
                  {entry.dominanceWhistleDelta !== null ? (
                    <span
                      className={`mt-0.5 block font-mono tabular-nums ${deltaClass(entry.dominanceWhistleDelta, 0.5)}`.trim()}
                    >
                      Whistle {formatSigned(entry.dominanceWhistleDelta)}
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-zinc-400">
                      Whistle n/a
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
