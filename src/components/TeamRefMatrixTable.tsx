"use client";

import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { TermHelp } from "@/components/TermHelp";
import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { foulEdgeTone, winRateTone } from "@/lib/metricTone";
import { formatPct, formatSigned, formatWinRateVsTeam } from "@/lib/stats-utils";
import {
  formatTeamRefCloseGamesTooltip,
  type TeamRefCloseGamesStat,
} from "@/lib/team-ref-close-games-display";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import type { TeamSampleRecord } from "@/lib/teamRecord";

export type TeamRefMatrixSport =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

export type TeamRefFilterMode = "all" | "favorable" | "unfavorable";

const TOP_REF_LIMIT = 10;

export function teamRefFilterLabel(mode: TeamRefFilterMode): string {
  switch (mode) {
    case "all":
      return "All";
    case "favorable":
      return "Favorable (Top 10)";
    case "unfavorable":
      return "Unfavorable (Top 10)";
  }
}

export function filterTeamRefEntries(
  entries: TeamRefLeaderboardEntry[],
  mode: TeamRefFilterMode,
): TeamRefLeaderboardEntry[] {
  if (mode === "all") return entries;
  const sorted = [...entries].sort((a, b) =>
    mode === "favorable" ? b.winRate - a.winRate : a.winRate - b.winRate,
  );
  return sorted.slice(0, TOP_REF_LIMIT);
}

export function TeamRefFilterBar({
  value,
  onChange,
}: {
  value: TeamRefFilterMode;
  onChange: (mode: TeamRefFilterMode) => void;
}) {
  const modes: TeamRefFilterMode[] = ["all", "favorable", "unfavorable"];

  return (
    <div
      className="team-ref-filter-bar refs-directory-metric-toggle"
      role="group"
      aria-label="Filter team ref splits"
    >
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          className={`team-ref-filter-btn${value === mode ? " team-ref-filter-btn--active" : ""}`}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          {teamRefFilterLabel(mode)}
        </button>
      ))}
    </div>
  );
}

function TeamRefMatrixRow({
  entry,
  rank,
  teamRecord,
  teamLabel,
  closeGames,
  dataLeague,
  basePath,
  sport,
}: {
  entry: TeamRefLeaderboardEntry;
  rank: number;
  teamRecord: TeamSampleRecord;
  teamLabel: string;
  closeGames: TeamRefCloseGamesStat;
  dataLeague: DataLeague;
  basePath: string;
  sport: TeamRefMatrixSport;
}) {
  const winTone = winRateTone(entry.winRate, teamRecord.winRate);
  const foulTone = foulEdgeTone(entry.avgFoulDifferential);
  const winDelta = formatWinRateVsTeam(entry.winRate, teamRecord.winRate);
  const closeFraction = `${closeGames.closeCount}/${closeGames.totalGames || entry.games}`;
  const closeTooltip = formatTeamRefCloseGamesTooltip(
    closeGames,
    teamLabel,
    dataLeague,
  );

  return (
    <li className="team-ref-matrix-row">
      <span className="team-ref-matrix-rank tabular-nums" aria-hidden>
        {rank}
      </span>
      <div className="team-ref-matrix-ref">
        <Link
          href={`${basePath}/refs/${entry.slug}`}
          className="team-ref-matrix-ref-link"
          aria-label={`${entry.name} profile`}
        >
          <RefAvatar
            name={entry.name}
            slug={entry.slug}
            sport={sport}
            size="sm"
            className="team-ref-matrix-ref-avatar"
          />
          <span className="team-ref-matrix-ref-name">{entry.name}</span>
        </Link>
      </div>
      <span
        className={`team-ref-matrix-stat team-ref-matrix-stat--win tabular-nums team-ref-matrix-stat--${winTone}`}
      >
        {formatPct(entry.winRate)}
      </span>
      <span
        className={`team-ref-matrix-stat team-ref-matrix-stat--baseline tabular-nums team-ref-matrix-stat--${winTone}`}
        title={`Win rate vs team baseline (${formatPct(teamRecord.winRate)})`}
      >
        {winDelta}
      </span>
      <span className="team-ref-matrix-stat team-ref-matrix-stat--close tabular-nums">
        {closeTooltip ? (
          <MetricInfoHint hint={closeTooltip}>
            <button type="button" className="team-ref-matrix-close-btn">
              {closeFraction}
            </button>
          </MetricInfoHint>
        ) : (
          closeFraction
        )}
      </span>
      <span
        className={`team-ref-matrix-stat team-ref-matrix-stat--whistle tabular-nums team-ref-matrix-stat--${foulTone}`}
        title="Whistle differential per game"
      >
        {formatSigned(entry.avgFoulDifferential)}
      </span>
    </li>
  );
}

export function TeamRefMatrixTable({
  entries,
  teamRecord,
  teamLabel,
  closeGamesByRef,
  dataLeague,
  basePath,
  sport,
}: {
  entries: TeamRefLeaderboardEntry[];
  teamRecord: TeamSampleRecord;
  teamLabel: string;
  closeGamesByRef: Record<string, TeamRefCloseGamesStat>;
  dataLeague: DataLeague;
  basePath: string;
  sport: TeamRefMatrixSport;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No qualified refs in this view for {teamLabel} yet.
      </p>
    );
  }

  return (
    <div className="team-ref-matrix-table">
      <div className="team-ref-matrix-head" aria-hidden>
        <span className="team-ref-matrix-head-rank">#</span>
        <span className="team-ref-matrix-head-ref">Ref</span>
        <span className="team-ref-matrix-head-stat">Win rate</span>
        <span className="team-ref-matrix-head-stat">vs baseline</span>
        <span className="team-ref-matrix-head-stat">Close games</span>
        <span className="team-ref-matrix-head-stat">
          <TermHelp id="foul-edge">Whistle diff</TermHelp>
        </span>
      </div>
      <ol className="team-ref-matrix-list">
        {entries.map((entry, index) => (
          <TeamRefMatrixRow
            key={entry.slug}
            entry={entry}
            rank={index + 1}
            teamRecord={teamRecord}
            teamLabel={teamLabel}
            closeGames={
              closeGamesByRef[entry.slug] ?? {
                closeCount: 0,
                totalGames: entry.games,
                closeGames: [],
              }
            }
            dataLeague={dataLeague}
            basePath={basePath}
            sport={sport}
          />
        ))}
      </ol>
    </div>
  );
}
