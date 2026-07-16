"use client";

import Link from "next/link";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { LeagueSlateGamesList } from "@/components/LeagueSlateGamesList";
import type { OverviewLeagueSlateGroup as OverviewLeagueSlateGroupData } from "@/lib/overview-upcoming-slate";
import { formatLeagueSlateCounts } from "@/lib/overview-upcoming-slate";

type OverviewLeagueSlateGroupProps = {
  group: OverviewLeagueSlateGroupData;
};

export function OverviewLeagueSlateGroup({ group }: OverviewLeagueSlateGroupProps) {
  const countLabel = formatLeagueSlateCounts(group.liveCount, group.scheduledCount);

  return (
    <section
      className="overview-slate-league-group"
      data-league={group.leagueId}
      aria-labelledby={`overview-slate-${group.leagueId}-heading`}
    >
      <header className="overview-slate-league-header">
        <Link
          href={group.href}
          id={`overview-slate-${group.leagueId}-heading`}
          className="overview-slate-league-heading rw-focus-ring"
        >
          <span className="overview-slate-league-heading-mark" aria-hidden>
            <LeagueNavMark league={group.leagueId} active={false} />
          </span>
          <span className="overview-slate-league-heading-copy">
            <span className="overview-slate-league-heading-label">{group.leagueLabel}</span>
            {countLabel ? (
              <span className="overview-slate-league-heading-counts">{countLabel}</span>
            ) : null}
          </span>
          <span className="overview-slate-league-heading-cta">Open slate</span>
        </Link>
      </header>
      <ul className="overview-slate-list">
        <LeagueSlateGamesList games={group.games} leagueShortLabel={group.leagueShortLabel} />
      </ul>
    </section>
  );
}
