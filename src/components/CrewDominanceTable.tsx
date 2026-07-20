"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { OfficialRoleBadge } from "@/components/OfficialRoleBadge";
import { EmptyState } from "@/components/shared/EmptyState";
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

function dominanceDeltaClass(value: number, threshold: number): string {
  const tone = deltaTone(value, threshold);
  if (tone === "positive") return "dom-delta-positive";
  if (tone === "negative") return "dom-delta-negative";
  return "";
}

function DominanceMetric({ value, threshold }: { value: number | null; threshold: number }) {
  if (value === null) return <span className="text-xs text-zinc-400">n/a</span>;
  return (
    <span className={`inline-flex min-w-[3.25rem] justify-end font-tabular text-xs text-zinc-700 ${dominanceDeltaClass(value, threshold)}`.trim()}>
      {formatSigned(value)}
    </span>
  );
}

export function CrewDominanceTable({ entries, basePath, league, overBaseline, leagueAvgFouls, linesmanSlugs }: {
  entries: CrewDominanceEntry[]; basePath: string; league: LeagueId; overBaseline: number; leagueAvgFouls: number; linesmanSlugs?: ReadonlySet<string>;
}) {
  const [sort, setSort] = useState<CrewDominanceSort>("games-desc");
  const sport = league === "nhl" ? "nhl" : "nba";
  const scoreUnit = league === "nhl" ? "goals" : "points";
  const whistleLabel = league === "nhl" ? "PIM" : "fouls";
  const sorted = useMemo(() => sortCrewDominance(entries, sort), [entries, sort]);

  if (entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      <div className="ranking-toolbar">
        <div className="ranking-toolbar-row items-center">
          <p className="ranking-toolbar-context m-0 min-w-0 flex-1">League baseline: {overBaseline} combined {scoreUnit} over benchmark · {leagueAvgFouls} avg {whistleLabel}/game</p>
          <label className="ranking-toggle shrink-0"><span>Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as CrewDominanceSort)} className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm">
              {CREW_DOMINANCE_SORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </label>
        </div>
      </div>
      <div className="ranking-table-wrap stat-data-container">
        <table className="data-table ranking-table min-w-[800px]">
          <thead><tr className="data-table-head">
            <th className="data-table-rank">#</th><th>Crew</th>
            <th className="data-table-num master-table-head-secondary">Games</th><th className="data-table-num master-table-head-secondary">Pace</th>
            <th className="data-table-num">Scoring Δ</th><th className="data-table-num master-table-head-secondary">{whistleLabel} Δ</th>
            <th className="data-table-num master-table-head-secondary">Over rate</th><th className="data-table-num master-table-head-secondary">DOM PACE Δ</th><th className="data-table-num master-table-head-secondary">DOM WHISTLE Δ</th>
          </tr></thead>
          <tbody>{sorted.map((entry, index) => (
            <tr key={entry.crewKey} className="data-table-row">
              <td className="data-table-rank font-tabular text-xs text-zinc-500">{index + 1}</td>
              <td className="align-middle"><div className="flex flex-row flex-nowrap items-center gap-1.5 py-0.5">
                {entry.memberSlugs.map((slug, i) => (
                  <Link key={slug} href={`${basePath}/refs/${slug}#close-game`} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface-raised px-1.5 py-0.5 text-[11px] leading-tight text-ink-secondary transition hover:border-border hover:bg-surface hover:text-foreground">
                    <RefAvatar name={entry.crewNames[i] ?? slug} slug={slug} sport={sport} size="sm" className="!h-5 !w-5" />{entry.crewNames[i] ?? slug}
                    {linesmanSlugs?.has(slug) ? <OfficialRoleBadge role="linesman" /> : null}
                  </Link>))}
              </div></td>
              <td className="data-table-num align-middle master-table-metric-secondary"><div className="flex flex-col items-end gap-0.5"><span className="font-tabular text-sm">{entry.games}</span><span className="text-[10px] leading-tight text-zinc-500 whitespace-nowrap">{entry.teamCount} teams</span></div></td>
              <td className="data-table-num align-middle font-tabular text-sm master-table-metric-secondary">{entry.avgTotalPoints}</td>
              <td className={`data-table-num align-middle font-tabular text-sm ${deltaClass(entry.scoringDelta, 1.5)}`.trim()}>{formatSigned(entry.scoringDelta)}</td>
              <td className={`data-table-num align-middle font-tabular text-sm master-table-metric-secondary ${deltaClass(entry.whistleDelta, 0.8)}`.trim()}>{formatSigned(entry.whistleDelta)}</td>
              <td className="data-table-num align-middle font-tabular text-sm master-table-metric-secondary">{formatPct(entry.overRate)}</td>
              <td className="data-table-num align-middle master-table-metric-secondary"><DominanceMetric value={entry.dominanceScoringDelta} threshold={1} /></td>
              <td className="data-table-num align-middle master-table-metric-secondary"><DominanceMetric value={entry.dominanceWhistleDelta} threshold={0.5} /></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
