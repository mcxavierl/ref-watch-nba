"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TeamRefSortBar } from "@/components/TeamRefSortBar";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { TeamRefLeaderboardEntry, TeamRefSort } from "@/lib/teamRefLeaderboards";
import {
  sortTeamRefEntries,
  TEAM_REF_MIN_GAMES,
} from "@/lib/teamRefLeaderboards";

export function TeamRefRankingsTable({
  entries,
  teamLabel,
  overBaseline,
  defaultSort = "foulEdge-desc",
  limit,
}: {
  entries: TeamRefLeaderboardEntry[];
  teamLabel: string;
  overBaseline: number;
  defaultSort?: TeamRefSort;
  limit?: number;
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
      <div className="border-b border-border-subtle px-4 py-3">
        <TeamRefSortBar value={sort} onChange={setSort} id="team-ref-rankings-sort" />
      </div>
      <div className="divide-y divide-border-subtle">
        {visible.map((entry, index) => (
          <Link
            key={entry.slug}
            href={`/refs/${entry.slug}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm transition hover:bg-zinc-50"
          >
            <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-zinc-500">
              {index + 1}
            </span>
            <span className="min-w-[8rem] flex-1 font-medium text-zinc-800">
              {entry.name}
            </span>
            <span className="font-mono text-xs tabular-nums text-zinc-600">
              {entry.games} gp
            </span>
            <span className="font-mono text-xs tabular-nums text-zinc-900">
              {formatPct(entry.winRate)} wins
            </span>
            <span className="font-mono text-xs tabular-nums text-zinc-900">
              {formatSigned(entry.avgFoulDifferential)} foul edge
            </span>
            <span className="hidden font-mono text-xs tabular-nums text-zinc-600 sm:inline">
              {entry.avgTotalPoints} avg · {formatPct(entry.overRate)} over{" "}
              {overBaseline}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
