"use client";

import { ArrowRight } from "lucide-react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { leagueHubRibbonClass } from "@/lib/league-hub-accent";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { formatLeaguePaceValue } from "@/lib/league-pace-bars";
import { isCollegeLiveLeague } from "@/lib/verified-live-leagues";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

type LeagueHubCardProps = {
  card: LeagueOverviewCard;
};

export function LeagueHubCard({ card }: LeagueHubCardProps) {
  const pending = !card.analyticsUnlocked;
  const collegeTier = isCollegeLiveLeague(card.leagueId);
  const ribbonClass = leagueHubRibbonClass(card.leagueId);

  return (
    <PrefetchLink
      href={pending ? (card.auditHref ?? card.href) : card.href}
      className={[
        "overview-league-chooser-card",
        "overview-league-chooser-card--hub-layout",
        "rw-focus-ring",
        "relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-xl",
        collegeTier ? "overview-league-chooser-card--college-tier" : "",
        pending ? "overview-league-chooser-card--pending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-league={card.leagueId}
    >
      <div
        className={`league-hub-card-ribbon h-1 w-full shrink-0 ${ribbonClass}`.trim()}
        aria-hidden
      />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="overview-league-chooser-top shrink-0">
          <span className="overview-league-chooser-mark shrink-0" aria-hidden>
            <LeagueNavMark league={card.leagueId as LeagueId} active={false} />
          </span>
          <div className="overview-league-chooser-label-row min-w-0">
            {collegeTier ? (
              <span className="overview-league-chooser-scope truncate text-xs text-slate-400">
                College sports
              </span>
            ) : null}
            <span className="overview-league-chooser-label truncate text-sm font-semibold text-white drop-shadow-sm">
              {collegeTier ? card.shortLabel : card.label}
            </span>
          </div>
          <span className="overview-league-chooser-meta tabular-nums truncate font-mono text-xs text-slate-400">
            {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
          </span>
        </div>

        <div className="overview-league-chooser-metrics mt-4 min-h-0 flex-1 space-y-2 tabular-nums">
          {pending ? (
            <span className="overview-league-chooser-pending break-words text-xs text-slate-400">
              {card.auditPendingLabel ?? "Pending Verification"} - hub locked
            </span>
          ) : (
            <>
              <div className="overview-league-chooser-metric min-w-0">
                <span className="overview-league-chooser-metric-label whitespace-nowrap text-xs text-slate-400">
                  {card.whistleLabel}
                </span>
                <strong className="shrink-0 font-mono text-sm font-bold tracking-tight text-white">
                  {formatLeaguePaceValue(card.whistlePerGame)}
                </strong>
              </div>
              <div className="overview-league-chooser-metric min-w-0">
                <span className="overview-league-chooser-metric-label whitespace-nowrap text-xs text-slate-400">
                  {card.scoreLabel}
                </span>
                <strong className="shrink-0 font-mono text-sm font-bold tracking-tight text-white">
                  {formatLeaguePaceValue(card.scorePerGame)}
                </strong>
              </div>
            </>
          )}
        </div>
      </div>

      <span className="overview-league-chooser-cta league-hub-card-cta mx-4 mb-4 mt-auto flex shrink-0 items-center justify-between border-t border-slate-800/60 pt-3 text-xs uppercase tracking-wide text-slate-400">
        <span>{pending ? "View audit status" : "Open hub"}</span>
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </span>
    </PrefetchLink>
  );
}
