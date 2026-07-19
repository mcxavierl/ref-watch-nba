import { PrefetchLink } from "@/components/PrefetchLink";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { NcaaAuditStatusPill } from "@/components/NcaaAuditStatusPill";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import {
  formatLeaguePaceValue,
  isLeaguePaceMetricZero,
  paceBarWidthPercent,
  sortLeaguePaceCards,
} from "@/lib/league-pace-bars";
import { isCollegeLiveLeague } from "@/lib/verified-live-leagues";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

type PaceBarProps = {
  leagueId: LeagueOverviewCard["leagueId"];
  track: "whistle" | "score";
  rawValue: number;
};

function PaceBar({ leagueId, track, rawValue }: PaceBarProps) {
  const width = paceBarWidthPercent(leagueId, track, rawValue);
  const isZero = isLeaguePaceMetricZero(rawValue);

  return (
    <div className="overview-pace-bar" aria-hidden>
      <span
        className={`overview-pace-bar-fill overview-pace-bar-fill--${track}${
          isZero ? " overview-pace-bar-fill--zero" : ""
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function PaceCardBody({ card }: { card: LeagueOverviewCard }) {
  const pending = !card.analyticsUnlocked;

  return (
    <>
      <div className="overview-pace-card-content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-sm">
        <div className="overview-pace-card-head min-w-0">
          <div className="league-header league-header--compact min-w-0">
            <span className="overview-pace-label truncate text-sm">{card.shortLabel}</span>
            <LeagueSeasonStartBadge leagueId={card.leagueId} />
          </div>
          {pending && card.auditCoveragePct != null && card.auditHref ? (
            <NcaaAuditStatusPill
              coveragePct={card.auditCoveragePct}
              auditHref={card.auditHref}
              className="overview-pace-audit-pill"
              asLabel
            />
          ) : null}
          <span className="overview-pace-meta truncate text-xs">
            {formatCount(card.refCount)} refs · {card.seasonCount} seasons
          </span>
          {pending ? (
            <p className="overview-pace-pending text-xs">
              <StatusBadge
                verdict="caution"
                label={card.auditPendingLabel ?? "Pending Verification"}
                compact
              />
              <span className="overview-pace-pending-copy break-words">
                Detailed analytics locked
              </span>
            </p>
          ) : null}
        </div>

        {pending ? null : (
          <>
            <div className="overview-pace-metric min-w-0">
              <div className="overview-pace-metric-head">
                <span className="truncate whitespace-nowrap text-xs">{card.whistleLabel}</span>
                <strong className="shrink-0 font-bold tabular-nums text-sm">
                  {formatLeaguePaceValue(card.whistlePerGame)}
                </strong>
              </div>
              <PaceBar leagueId={card.leagueId} track="whistle" rawValue={card.whistlePerGame} />
            </div>

            <div className="overview-pace-metric min-w-0">
              <div className="overview-pace-metric-head">
                <span className="truncate whitespace-nowrap text-xs">{card.scoreLabel}</span>
                <strong className="shrink-0 font-bold tabular-nums text-sm">
                  {formatLeaguePaceValue(card.scorePerGame)}
                </strong>
              </div>
              <PaceBar leagueId={card.leagueId} track="score" rawValue={card.scorePerGame} />
            </div>
          </>
        )}
      </div>

      <span className="overview-pace-cta mt-auto shrink-0 text-xs uppercase tracking-wide">
        {pending ? "View audit status" : "Open hub"} <ArrowRight aria-hidden />
      </span>
    </>
  );
}

type OverviewLeaguePaceGridProps = {
  cards: LeagueOverviewCard[];
  /** When set, only render cards for these leagues (e.g. college tier). */
  leagueFilter?: (card: LeagueOverviewCard) => boolean;
  gridClassName?: string;
};

export function OverviewLeaguePaceGrid({
  cards,
  leagueFilter,
  gridClassName = "overview-pace-grid grid grid-cols-1 gap-3 sm:grid-cols-2",
}: OverviewLeaguePaceGridProps) {
  const orderedCards = sortLeaguePaceCards(
    cards.filter(
      (card) =>
        isDashboardLeagueExposed(card.leagueId) &&
        (leagueFilter ? leagueFilter(card) : true),
    ),
  );

  if (orderedCards.length === 0) return null;

  return (
    <div className={gridClassName}>
      {orderedCards.map((card) => {
        const pending = !card.analyticsUnlocked;

        if (pending) {
          return (
            <PrefetchLink
              key={card.leagueId}
              href={card.auditHref ?? card.href}
              className="overview-pace-card overview-pace-card--pending flex h-full min-h-0 flex-col overflow-hidden"
              data-league={card.leagueId}
              data-verification="audit-in-progress"
            >
              <PaceCardBody card={card} />
            </PrefetchLink>
          );
        }

        return (
          <PrefetchLink
            key={card.leagueId}
            href={card.href}
            className="overview-pace-card flex h-full min-h-0 flex-col overflow-hidden"
            data-league={card.leagueId}
          >
            <PaceCardBody card={card} />
          </PrefetchLink>
        );
      })}
    </div>
  );
}

/** College-only pace grid for the overview dashboard. */
export function OverviewCollegePaceGrid({ cards }: { cards: LeagueOverviewCard[] }) {
  return (
    <OverviewLeaguePaceGrid
      cards={cards}
      leagueFilter={(card) => isCollegeLiveLeague(card.leagueId)}
    />
  );
}
