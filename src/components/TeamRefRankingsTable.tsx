"use client";

import Link from "next/link";
import { ArrowUpDown, Trophy, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { TeamRefSortBar } from "@/components/TeamRefSortBar";
import { formatPct, formatSigned, formatWinRateVsTeam } from "@/lib/stats-utils";
import { foulEdgeTone, winRateTone } from "@/lib/metricTone";
import type { TeamRefLeaderboardEntry, TeamRefSort } from "@/lib/teamRefLeaderboards";
import {
  sortTeamRefEntries,
  TEAM_REF_MIN_GAMES,
} from "@/lib/teamRefLeaderboards";
import type { TeamSampleRecord } from "@/lib/teamRecord";

export function TeamRefRankingsTable({
  entries,
  teamLabel,
  teamRecord,
  overBaseline,
  defaultSort = "foulEdge-desc",
  limit,
  basePath = "",
}: {
  entries: TeamRefLeaderboardEntry[];
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  overBaseline: number;
  defaultSort?: TeamRefSort;
  limit?: number;
  basePath?: string;
}) {
  const [sort, setSort] = useState<TeamRefSort>(defaultSort);

  const sorted = useMemo(
    () => sortTeamRefEntries(entries, sort),
    [entries, sort],
  );
  const visible = limit ? sorted.slice(0, limit) : sorted;

  if (entries.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-600">
        No refs with {TEAM_REF_MIN_GAMES}+ games for {teamLabel} yet.
      </p>
    );
  }

  return (
    <div>
      <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
        <TeamRefSortBar value={sort} onChange={setSort} id="team-ref-rankings-sort" />
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <Trophy className="size-4 text-amber-600" aria-hidden />
          Team baseline: {teamRecord.wins}-{teamRecord.losses} (
          {formatPct(teamRecord.winRate)})
        </p>
      </div>
      <div className="divide-y divide-border-subtle">
        {visible.map((entry, index) => {
          const winTone = winRateTone(entry.winRate, teamRecord.winRate);
          const foulTone = foulEdgeTone(entry.avgFoulDifferential);
          const winBadge =
            winTone === "positive"
              ? "bg-emerald-100 text-emerald-800"
              : winTone === "negative"
                ? "bg-rose-100 text-rose-800"
                : "bg-zinc-100 text-zinc-700";

          return (
            <Link
              key={entry.slug}
              href={`${basePath}/refs/${entry.slug}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-sm transition hover:bg-zinc-50 sm:px-5"
            >
              <span className="w-6 shrink-0 font-mono text-sm tabular-nums text-zinc-400">
                {index + 1}
              </span>
              <span className="min-w-[8rem] flex-1 font-medium text-zinc-900">
                {entry.name}
              </span>
              <span className="font-mono text-sm tabular-nums text-zinc-600">
                {entry.games} gp
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-sm tabular-nums ${winBadge}`}
              >
                <Trophy className="size-3.5" aria-hidden />
                {formatPct(entry.winRate)}
              </span>
              <span className="font-mono text-sm tabular-nums text-zinc-700">
                {formatWinRateVsTeam(entry.winRate, teamRecord.winRate)}
              </span>
              <span
                className={`inline-flex items-center gap-1 font-mono text-sm tabular-nums ${
                  foulTone === "positive"
                    ? "text-emerald-700"
                    : foulTone === "negative"
                      ? "text-rose-700"
                      : "text-zinc-700"
                }`}
              >
                <Volume2 className="size-3.5" aria-hidden />
                {formatSigned(entry.avgFoulDifferential)}
              </span>
              <span className="hidden font-mono text-sm tabular-nums text-zinc-500 sm:inline">
                {entry.avgTotalPoints} avg · {formatPct(entry.overRate)} / {overBaseline}
              </span>
              <ArrowUpDown className="ml-auto size-4 text-zinc-300" aria-hidden />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
