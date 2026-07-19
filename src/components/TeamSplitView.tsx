"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ClinicalCard } from "@/components/hub/ClinicalCard";
import {
  REF_CARD_CLASS,
  REF_CARD_METRIC_CLASS,
  StatComparison,
} from "@/components/hub/RefCard";
import {
  NeutralDivergenceBar,
  StandoutMetricValue,
} from "@/components/StandoutMetric";
import { TermHelp } from "@/components/TermHelp";
import { VerifiedGamesHint } from "@/components/VerifiedGamesHint";
import { TeamRefSortBar } from "@/components/TeamRefSortBar";
import { MatrixFilterBar, MatrixView } from "@/components/analytics/MatrixView";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLeagueMatrixData, type LeagueMatrixSport } from "@/hooks/useLeagueMatrixData";
import {
  filterTeamCrewSplits,
  sortTeamCrewSplits,
  TEAM_CREW_MIN_GAMES,
  TEAM_CREW_SORT_OPTIONS,
  type TeamCrewSort,
} from "@/lib/teamCrewSplits";
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
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import type { TeamRefCloseGamesStat } from "@/lib/team-ref-close-games-display";
import type { DataLeague } from "@/lib/game-logs-preload";
import type { TeamSampleRecord } from "@/lib/teamRecord";
import type { RefProfile, TeamCrewSplit } from "@/lib/types";

type SplitView = "crew" | "ref";

function TeamSplitMetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {children}
    </div>
  );
}

function TeamSplitMetricColumn({
  label,
  value,
  tone,
  comparison,
  detail,
  showNeutralBar = false,
}: {
  label: ReactNode;
  value: string;
  tone: "positive" | "negative" | "neutral";
  comparison?: string;
  detail?: string;
  showNeutralBar?: boolean;
}) {
  return (
    <div className="team-split-metric clinical-metric-card flex flex-col gap-1.5 px-4 py-4 sm:px-5">
      <span className="ref-card-metric-label text-sm font-medium text-zinc-600">
        {label}
      </span>
      <div className={REF_CARD_METRIC_CLASS}>
        <StandoutMetricValue tone={tone} size="lg" className="tabular-nums">
          {value}
        </StandoutMetricValue>
      </div>
      {comparison ? (
        <StatComparison className="text-sm text-slate-500">{comparison}</StatComparison>
      ) : null}
      {detail ? (
        <p className="text-sm text-slate-500 tabular-nums">{detail}</p>
      ) : null}
      {showNeutralBar && tone === "neutral" ? <NeutralDivergenceBar /> : null}
    </div>
  );
}

function TeamCrewSortBar({
  value,
  onChange,
  id,
}: {
  value: TeamCrewSort;
  onChange: (sort: TeamCrewSort) => void;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={id ?? "team-crew-sort"}
        className="text-sm font-medium text-zinc-600"
      >
        Sort by
      </label>
      <select
        id={id ?? "team-crew-sort"}
        value={value}
        onChange={(e) => onChange(e.target.value as TeamCrewSort)}
        className="rounded-md border border-border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
      >
        {TEAM_CREW_SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}


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
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm text-ink-secondary transition hover:border-border hover:bg-surface hover:text-foreground"
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
    <ClinicalCard
      as="article"
      className={`team-crew-split-card ${REF_CARD_CLASS} overflow-hidden border-slate-800`}
    >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold leading-snug text-zinc-900">
          {split.crewNames.join(" · ")}
        </h2>
        <p className="mt-1 text-sm text-slate-500 tabular-nums">
          <VerifiedGamesHint>
            {split.games} games
          </VerifiedGamesHint>
          {" "}· {split.wins}-{split.losses} with {teamLabel}
        </p>
      </div>

      <TeamSplitMetricGrid>
        <TeamSplitMetricColumn
          label="Scoring"
          value={`${split.avgTotalPoints} avg`}
          tone={scoreTone}
          comparison={`${formatSigned(split.totalDelta)} vs league`}
          detail={`${formatPct(split.overRate)} over ${overBaseline} pts`}
        />
        <TeamSplitMetricColumn
          label="Record"
          value={`${split.wins}-${split.losses}`}
          tone={winTone}
          comparison={formatWinRateVsTeam(crewWinRate, teamRecord.winRate)}
          detail={`${formatPct(crewWinRate)} win rate`}
        />
        <TeamSplitMetricColumn
          label={<TermHelp id="foul-edge">Whistle differential</TermHelp>}
          value={`${formatSigned(split.foulDifferential)} vs avg`}
          tone={foulTone}
          comparison={`${split.avgFouls} fouls/game (${formatSigned(foulsDelta)} vs league)`}
          detail={`${teamAbbr} ${split.avgTeamFouls} · opp ${split.avgOpponentFouls}`}
          showNeutralBar
        />
      </TeamSplitMetricGrid>

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
    </ClinicalCard>
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
  sport = "nba",
  dataLeague = "NBA",
  closeGamesByRef = {},
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
  sport?: LeagueMatrixSport;
  dataLeague?: DataLeague;
  closeGamesByRef?: Record<string, TeamRefCloseGamesStat>;
}) {
  const [view, setView] = useState<SplitView>("ref");
  const [crewSort, setCrewSort] = useState<TeamCrewSort>("games-desc");
  const [showAllCrews, setShowAllCrews] = useState(false);

  const matrix = useLeagueMatrixData({
    teamAbbr,
    refEntries: refSplits,
    teamRecord,
    teamLabel,
    closeGamesByRef,
    dataLeague,
    basePath,
    sport,
  });

  const { visible: visibleCrewSplits, hiddenCount: hiddenCrewCount } = useMemo(
    () => filterTeamCrewSplits(crewSplits, TEAM_CREW_MIN_GAMES, showAllCrews),
    [crewSplits, showAllCrews],
  );

  const sortedCrewSplits = useMemo(
    () => sortTeamCrewSplits(visibleCrewSplits, crewSort),
    [visibleCrewSplits, crewSort],
  );

  const qualifiedCrewCount = useMemo(
    () => crewSplits.filter((split) => split.games >= TEAM_CREW_MIN_GAMES).length,
    [crewSplits],
  );
  const crewTabCount =
    qualifiedCrewCount > 0 ? qualifiedCrewCount : crewSplits.length;
  const showCrewTab = sport !== "cbb";
  const teamBaselineLabel =
    teamRecord.games > 0 ? formatPct(teamRecord.winRate) : undefined;

  return (
    <div>
      {showCrewTab ? (
      <div
        className="mb-4 flex gap-1 rounded-lg border border-border bg-surface-raised/40 p-1"
        role="tablist"
        aria-label={`View ${teamLabel} by ref or crew`}
      >
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
          Crews ({crewTabCount})
        </button>
      </div>
      ) : null}

      {(showCrewTab ? view === "ref" : true) ? (
        refSplits.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3">
              <MatrixFilterBar
                value={matrix.filterMode}
                onChange={matrix.setFilterMode}
              />
              {!matrix.isTopTenView ? (
                <TeamRefSortBar
                  value={matrix.sort}
                  onChange={matrix.setSort}
                  id="team-ref-cards-sort"
                />
              ) : null}
            </div>
            <MatrixView
              rows={matrix.rows}
              sport={sport}
              teamLabel={teamLabel}
              teamBaselineLabel={teamBaselineLabel}
              onReset={() => matrix.setFilterMode("all")}
            />
          </>
        )
      ) : (
        crewSplits.length === 0 ? (
          <EmptyState
            message={
              refSplits.length > 0
                ? `No crew groupings for ${teamLabel} in this sample yet.`
                : "No data available for this range"
            }
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TeamCrewSortBar
                value={crewSort}
                onChange={setCrewSort}
                id="team-crew-cards-sort"
              />
              {hiddenCrewCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCrews((v) => !v)}
                  className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                >
                  {showAllCrews
                    ? `Hide crews under ${TEAM_CREW_MIN_GAMES} games`
                    : `Show ${hiddenCrewCount} more crews under ${TEAM_CREW_MIN_GAMES} games`}
                </button>
              )}
            </div>
            {sortedCrewSplits.length === 0 ? (
              <EmptyState onReset={() => setShowAllCrews(true)} />
            ) : (
              <div className="space-y-4">
                {sortedCrewSplits.map((split) => (
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
            )}
          </>
        )
      )}
    </div>
  );
}
