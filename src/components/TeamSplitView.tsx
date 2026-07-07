"use client";

import Link from "next/link";
import {
  ChevronDown,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Volume2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MetricBlock, MetricGrid } from "@/components/MetricBlock";
import { TermHelp } from "@/components/TermHelp";
import { TeamRefSortBar } from "@/components/TeamRefSortBar";
import {
  formatPct,
  formatSigned,
  formatWinRateVsTeam,
} from "@/lib/stats-utils";
import {
  foulEdgeTone,
  scoringDeltaTone,
  winRateTone,
} from "@/lib/metricTone";
import type { TeamRefLeaderboardEntry, TeamRefSort } from "@/lib/teamRefLeaderboards";
import { sortTeamRefEntries } from "@/lib/teamRefLeaderboards";
import type { TeamSampleRecord } from "@/lib/teamRecord";
import type { RefProfile, TeamCrewSplit } from "@/lib/types";

type SplitView = "crew" | "ref";

function RefLinkChip({
  name,
  slug,
  basePath = "",
}: {
  name: string;
  slug: string;
  basePath?: string;
}) {
  return (
    <Link
      href={`${basePath}/refs/${slug}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-zinc-50 px-3 py-1 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
    >
      {name}
    </Link>
  );
}

function TeamSplitCard({
  split,
  leagueAvgFouls,
  overBaseline,
  refs,
  teamAbbr,
  teamLabel,
  teamRecord,
  basePath = "",
}: {
  split: TeamCrewSplit;
  leagueAvgFouls: number;
  overBaseline: number;
  refs: Pick<RefProfile, "slug" | "name">[];
  teamAbbr: string;
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  basePath?: string;
}) {
  const crewWinRate = split.games > 0 ? split.wins / split.games : 0;
  const foulsDelta = Math.round((split.avgFouls - leagueAvgFouls) * 10) / 10;
  const winTone = winRateTone(crewWinRate, teamRecord.winRate);
  const foulTone = foulEdgeTone(split.foulDifferential);
  const scoreTone = scoringDeltaTone(split.totalDelta);

  return (
    <article className="data-card overflow-hidden">
      <div className="border-b border-border bg-gradient-to-r from-zinc-50 to-white px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold leading-snug text-zinc-900">
          {split.crewNames.join(" · ")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {split.games} games · {split.wins}-{split.losses} with {teamLabel}
        </p>
      </div>

      <MetricGrid>
        <MetricBlock
          icon={split.totalDelta >= 0 ? TrendingUp : TrendingDown}
          iconClassName={scoreTone === "positive" ? "text-emerald-600" : scoreTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label="Scoring"
          value={`${split.avgTotalPoints} avg`}
          hint={`${formatPct(split.overRate)} over ${overBaseline} pts`}
          badge={`${formatSigned(split.totalDelta)} vs league`}
          badgeTone={scoreTone}
        />
        <MetricBlock
          icon={Trophy}
          iconClassName={winTone === "positive" ? "text-emerald-600" : winTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label="Record"
          value={`${split.wins}-${split.losses}`}
          hint={`${formatPct(crewWinRate)} win rate`}
          badge={formatWinRateVsTeam(crewWinRate, teamRecord.winRate)}
          badgeTone={winTone}
        />
        <MetricBlock
          icon={Volume2}
          iconClassName={foulTone === "positive" ? "text-emerald-600" : foulTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label={<TermHelp id="foul-edge">Whistle</TermHelp>}
          value={`${formatSigned(split.foulDifferential)} edge`}
          hint={`${split.avgFouls} fouls/game (${formatSigned(foulsDelta)} vs league)`}
          badge={`${teamAbbr} ${split.avgTeamFouls} · opp ${split.avgOpponentFouls}`}
          badgeTone={foulTone}
        />
      </MetricGrid>

      <details className="group border-t border-border-subtle">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:px-5">
          <span>Home & away split</span>
          <ChevronDown className="size-4 text-zinc-400 transition group-open:rotate-180" />
        </summary>
        <div className="grid grid-cols-2 gap-3 border-t border-border-subtle bg-zinc-50/50 px-4 py-3 text-sm sm:px-5">
          <p>
            <span className="font-medium text-zinc-800">Home</span>{" "}
            <span className="font-mono tabular-nums text-zinc-700">
              {split.homeWins}-{split.homeLosses}
            </span>{" "}
            <span className="text-zinc-600">({split.homeGames} games)</span>
          </p>
          <p>
            <span className="font-medium text-zinc-800">Away</span>{" "}
            <span className="font-mono tabular-nums text-zinc-700">
              {split.awayWins}-{split.awayLosses}
            </span>{" "}
            <span className="text-zinc-600">({split.awayGames} games)</span>
          </p>
        </div>
      </details>

      <div className="flex flex-wrap gap-2 border-t border-border-subtle px-4 py-3 sm:px-5">
        {split.crewNames.map((name) => {
          const ref = refs.find((r) => r.name === name);
          if (!ref) return null;
          return (
            <RefLinkChip
              key={ref.slug}
              name={name}
              slug={ref.slug}
              basePath={basePath}
            />
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
  teamRecord,
  basePath = "",
}: {
  entry: TeamRefLeaderboardEntry;
  leagueAvgTotal: number;
  overBaseline: number;
  teamAbbr: string;
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  basePath?: string;
}) {
  const wins = Math.round(entry.winRate * entry.games);
  const totalDelta = entry.avgTotalPoints - leagueAvgTotal;
  const winTone = winRateTone(entry.winRate, teamRecord.winRate);
  const foulTone = foulEdgeTone(entry.avgFoulDifferential);
  const scoreTone = scoringDeltaTone(totalDelta);

  return (
    <article className="data-card overflow-hidden">
      <div className="border-b border-border bg-gradient-to-r from-zinc-50 to-white px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold leading-snug text-zinc-900">
          <Link
            href={`${basePath}/refs/${entry.slug}`}
            className="transition hover:text-raptors"
          >
            {entry.name}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {entry.games} games with {teamLabel} · ~{wins}-{entry.games - wins}
        </p>
      </div>

      <MetricGrid>
        <MetricBlock
          icon={Trophy}
          iconClassName={winTone === "positive" ? "text-emerald-600" : winTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label="Win rate"
          value={formatPct(entry.winRate)}
          hint={`Team baseline ${formatPct(teamRecord.winRate)}`}
          badge={formatWinRateVsTeam(entry.winRate, teamRecord.winRate)}
          badgeTone={winTone}
        />
        <MetricBlock
          icon={Target}
          iconClassName={scoreTone === "positive" ? "text-emerald-600" : scoreTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label="Totals"
          value={`${entry.avgTotalPoints} avg`}
          hint={`${formatPct(entry.overRate)} over ${overBaseline}`}
          badge={`${formatSigned(totalDelta)} vs league`}
          badgeTone={scoreTone}
        />
        <MetricBlock
          icon={Volume2}
          iconClassName={foulTone === "positive" ? "text-emerald-600" : foulTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label={<TermHelp id="foul-edge">Foul edge</TermHelp>}
          value={formatSigned(entry.avgFoulDifferential)}
          hint={`More fouls on ${teamLabel}'s opponents when positive`}
          badge={foulTone === "positive" ? `${teamAbbr} lean` : foulTone === "negative" ? "Opponent lean" : "Balanced"}
          badgeTone={foulTone}
        />
      </MetricGrid>
    </article>
  );
}

export function TeamSplitView({
  crewSplits,
  refSplits,
  refs,
  teamAbbr,
  teamLabel,
  teamRecord,
  leagueAvgTotal,
  leagueAvgFouls,
  overBaseline,
  basePath = "",
}: {
  crewSplits: TeamCrewSplit[];
  refSplits: TeamRefLeaderboardEntry[];
  refs: Pick<RefProfile, "slug" | "name">[];
  teamAbbr: string;
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  overBaseline: number;
  basePath?: string;
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
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${
            view === "crew"
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-border"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Crews ({crewSplits.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "ref"}
          onClick={() => setView("ref")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${
            view === "ref"
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-border"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Refs ({refSplits.length})
        </button>
      </div>

      {view === "crew" ? (
        crewSplits.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No crew history for {teamLabel} yet.
          </p>
        ) : (
          <div className="space-y-4">
            {crewSplits.map((split) => (
              <TeamSplitCard
                key={split.crewKey}
                split={split}
                leagueAvgFouls={leagueAvgFouls}
                overBaseline={overBaseline}
                refs={refs}
                teamAbbr={teamAbbr}
                teamLabel={teamLabel}
                teamRecord={teamRecord}
                basePath={basePath}
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
          <div className="mb-4">
            <TeamRefSortBar
              value={refSort}
              onChange={setRefSort}
              id="team-ref-cards-sort"
            />
          </div>
          <div className="space-y-4">
            {sortedRefSplits.map((entry) => (
              <TeamRefSplitCard
                key={entry.slug}
                entry={entry}
                leagueAvgTotal={leagueAvgTotal}
                overBaseline={overBaseline}
                teamAbbr={teamAbbr}
                teamLabel={teamLabel}
                teamRecord={teamRecord}
                basePath={basePath}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
