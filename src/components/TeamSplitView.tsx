"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TeamRefSortBar } from "@/components/TeamRefSortBar";
import { StatCell, StatSection, StatStrip } from "@/components/StatStrip";
import {
  formatPct,
  formatSigned,
  whistleBias,
} from "@/lib/stats-utils";
import {
  getOuLeanAnnotation,
  getWhistleAnnotation,
} from "@/lib/leanAnnotations";
import type { TeamRefLeaderboardEntry, TeamRefSort } from "@/lib/teamRefLeaderboards";
import { sortTeamRefEntries } from "@/lib/teamRefLeaderboards";
import type { RefProfile, TeamCrewSplit } from "@/lib/types";

type SplitView = "crew" | "ref";

function winPct(wins: number, games: number): string {
  if (games === 0) return "—";
  return formatPct(wins / games);
}

function TeamSplitCard({
  split,
  leagueAvgTotal,
  leagueAvgFouls,
  overBaseline,
  refs,
  teamAbbr,
  teamLabel,
}: {
  split: TeamCrewSplit;
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  overBaseline: number;
  refs: Pick<RefProfile, "slug" | "name">[];
  teamAbbr: string;
  teamLabel: string;
}) {
  const ouLean = getOuLeanAnnotation(
    split.overRate,
    split.avgTotalPoints,
    leagueAvgTotal,
  );
  const bias = whistleBias(split.foulDifferential);
  const whistleAnnotation = getWhistleAnnotation(bias, teamAbbr);
  const foulsDelta = Math.round((split.avgFouls - leagueAvgFouls) * 10) / 10;

  return (
    <article className="data-card">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-3">
        <h2 className="text-sm font-semibold leading-snug text-zinc-900">
          {split.crewNames.join(" · ")}
        </h2>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-600">
          {split.games} games · {split.wins}-{split.losses} (
          {winPct(split.wins, split.games)} wins)
        </p>
      </div>

      <StatSection title="Scoring">
        <StatStrip>
          <StatCell
            label="Avg combined score"
            value={String(split.avgTotalPoints)}
            detail={`${formatSigned(split.totalDelta)} vs league avg (${leagueAvgTotal})`}
            annotation={
              ouLean?.target === "avgTotal" ? ouLean.label : undefined
            }
          />
          <StatCell
            label={`Games over ${overBaseline} pts`}
            value={formatPct(split.overRate)}
            detail="Combined score beat the league benchmark"
            annotation={
              ouLean?.target === "overRate" ? ouLean.label : undefined
            }
          />
          <StatCell
            label="Win-loss record"
            value={`${split.wins}-${split.losses}`}
            detail={`${winPct(split.wins, split.games)} win rate`}
          />
        </StatStrip>
      </StatSection>

      <StatSection title="Fouls & whistles">
        <StatStrip>
          <StatCell
            label="Total fouls per game"
            value={String(split.avgFouls)}
            detail={`${formatSigned(foulsDelta)} vs league avg (${leagueAvgFouls})`}
          />
          <StatCell
            label={`${teamAbbr} fouls`}
            value={String(split.avgTeamFouls)}
            detail={`Called on ${teamLabel}`}
          />
          <StatCell
            label="Opponent fouls"
            value={String(split.avgOpponentFouls)}
            detail="Called on the other team"
          />
          <StatCell
            label="Foul edge"
            value={formatSigned(split.foulDifferential)}
            detail="Positive = more fouls on opponents"
            annotation={whistleAnnotation}
          />
        </StatStrip>
      </StatSection>

      <StatSection title="Home & away">
        <StatStrip>
          <StatCell
            label="Home record"
            value={`${split.homeWins}-${split.homeLosses}`}
            detail={`${split.homeGames} home games`}
          />
          <StatCell
            label="Away record"
            value={`${split.awayWins}-${split.awayLosses}`}
            detail={`${split.awayGames} away games`}
          />
          <StatCell
            label="Home win rate"
            value={winPct(split.homeWins, split.homeGames)}
          />
          <StatCell
            label="Away win rate"
            value={winPct(split.awayWins, split.awayGames)}
          />
        </StatStrip>
      </StatSection>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border-subtle px-4 py-2.5">
        {split.crewNames.map((name) => {
          const ref = refs.find((r) => r.name === name);
          if (!ref) return null;
          return (
            <Link
              key={ref.slug}
              href={`/refs/${ref.slug}`}
              className="text-[11px] text-zinc-600 transition hover:text-zinc-900"
            >
              {name} →
            </Link>
          );
        })}
      </div>
    </article>
  );
}

function TeamRefSplitCard({
  entry,
  leagueAvgTotal,
  overBaseline,
  teamAbbr,
  teamLabel,
}: {
  entry: TeamRefLeaderboardEntry;
  leagueAvgTotal: number;
  overBaseline: number;
  teamAbbr: string;
  teamLabel: string;
}) {
  const ouLean = getOuLeanAnnotation(
    entry.overRate,
    entry.avgTotalPoints,
    leagueAvgTotal,
  );
  const bias = whistleBias(entry.avgFoulDifferential);
  const whistleAnnotation = getWhistleAnnotation(bias, teamAbbr);
  const wins = Math.round(entry.winRate * entry.games);

  return (
    <article className="data-card">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-3">
        <h2 className="text-sm font-semibold leading-snug text-zinc-900">
          <Link
            href={`/refs/${entry.slug}`}
            className="transition hover:text-zinc-600"
          >
            {entry.name}
          </Link>
        </h2>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-600">
          {entry.games} games with {teamLabel} · ~{wins}-
          {entry.games - wins} ({formatPct(entry.winRate)} wins)
        </p>
      </div>

      <StatSection title="Scoring">
        <StatStrip>
          <StatCell
            label="Avg combined score"
            value={String(entry.avgTotalPoints)}
            detail={`${formatSigned(entry.avgTotalPoints - leagueAvgTotal)} vs league avg (${leagueAvgTotal})`}
            annotation={
              ouLean?.target === "avgTotal" ? ouLean.label : undefined
            }
          />
          <StatCell
            label={`Games over ${overBaseline} pts`}
            value={formatPct(entry.overRate)}
            detail="Combined score beat the league benchmark"
            annotation={
              ouLean?.target === "overRate" ? ouLean.label : undefined
            }
          />
          <StatCell
            label="Win rate"
            value={formatPct(entry.winRate)}
            detail={`Across ${entry.games} games`}
          />
        </StatStrip>
      </StatSection>

      <StatSection title="Fouls & whistles">
        <StatStrip>
          <StatCell
            label="Foul edge"
            value={formatSigned(entry.avgFoulDifferential)}
            detail={`Positive = more fouls on ${teamLabel}'s opponents`}
            annotation={whistleAnnotation}
          />
        </StatStrip>
      </StatSection>
    </article>
  );
}

export function TeamSplitView({
  crewSplits,
  refSplits,
  refs,
  teamAbbr,
  teamLabel,
  leagueAvgTotal,
  leagueAvgFouls,
  overBaseline,
}: {
  crewSplits: TeamCrewSplit[];
  refSplits: TeamRefLeaderboardEntry[];
  refs: Pick<RefProfile, "slug" | "name">[];
  teamAbbr: string;
  teamLabel: string;
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  overBaseline: number;
}) {
  const [view, setView] = useState<SplitView>("crew");
  const [refSort, setRefSort] = useState<TeamRefSort>("winRate-desc");

  const sortedRefSplits = useMemo(
    () => sortTeamRefEntries(refSplits, refSort),
    [refSplits, refSort],
  );

  return (
    <div>
      <div
        className="mb-4 flex gap-1 rounded-lg border border-border bg-surface-raised/40 p-1"
        role="tablist"
        aria-label={`View ${teamLabel} by crew or ref`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "crew"}
          onClick={() => setView("crew")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            view === "crew"
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-border"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Ref crews ({crewSplits.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "ref"}
          onClick={() => setView("ref")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            view === "ref"
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-border"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Individual refs ({refSplits.length})
        </button>
      </div>

      {view === "crew" ? (
        crewSplits.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No crew history for {teamLabel} yet.
          </p>
        ) : (
          <div className="space-y-3">
            {crewSplits.map((split) => (
              <TeamSplitCard
                key={split.crewKey}
                split={split}
                leagueAvgTotal={leagueAvgTotal}
                leagueAvgFouls={leagueAvgFouls}
                overBaseline={overBaseline}
                refs={refs}
                teamAbbr={teamAbbr}
                teamLabel={teamLabel}
              />
            ))}
          </div>
        )
      ) : refSplits.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No refs with enough games involving {teamLabel} yet.
        </p>
      ) : (
        <>
          <div className="mb-3">
            <TeamRefSortBar
              value={refSort}
              onChange={setRefSort}
              id="team-ref-cards-sort"
            />
          </div>
          <div className="space-y-3">
            {sortedRefSplits.map((entry) => (
              <TeamRefSplitCard
                key={entry.slug}
                entry={entry}
                leagueAvgTotal={leagueAvgTotal}
                overBaseline={overBaseline}
                teamAbbr={teamAbbr}
                teamLabel={teamLabel}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
