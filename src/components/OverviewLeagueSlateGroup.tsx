"use client";

import Link from "next/link";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { LeagueSlateGamesList } from "@/components/LeagueSlateGamesList";
import type { OverviewLeagueSlateGroup as OverviewLeagueSlateGroupData } from "@/lib/overview-slate-shared";
import { formatLeagueSlateCounts } from "@/lib/overview-slate-shared";

type OverviewLeagueSlateGroupProps = {
  group: OverviewLeagueSlateGroupData;
};

export function OverviewLeagueSlateGroup({ group }: OverviewLeagueSlateGroupProps) {
  const countLabel = formatLeagueSlateCounts(group.liveCount, group.scheduledCount);

  return (
    <section
      className="overview-slate-capsule"
      data-league={group.leagueId}
      aria-labelledby={`overview-slate-${group.leagueId}-heading`}
    >
      <header className="overview-slate-capsule-header">
        <span className="overview-slate-capsule-mark" aria-hidden>
          <LeagueNavMark league={group.leagueId} active={false} />
        </span>
        <div className="overview-slate-capsule-copy">
          <span className="overview-slate-capsule-label" id={`overview-slate-${group.leagueId}-heading`}>
            {group.leagueLabel}
          </span>
          {countLabel ? (
            <span className="overview-slate-capsule-meta">{countLabel}</span>
          ) : null}
        </div>
        <Link href={group.href} className="overview-slate-capsule-cta rw-focus-ring">
          Open slate
        </Link>
      </header>
      <ul className="overview-slate-list">
        <LeagueSlateGamesList games={group.games} leagueShortLabel={group.leagueShortLabel} />
      </ul>
    </section>
  );
}
