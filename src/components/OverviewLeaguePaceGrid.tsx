import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
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
      <div className="overview-pace-card-head">
        <div className="league-header league-header--compact">
          <span className="overview-pace-label-row">
            <span className="overview-pace-label">{card.shortLabel}</span>
            {pending && card.auditCoveragePct != null && card.auditHref ? (
              <NcaaAuditStatusPill
                coveragePct={card.auditCoveragePct}
                auditHref={card.auditHref}
                pendingLabel={card.auditPendingLabel}
                className="overview-pace-audit-pill"
                asLabel
              />
            ) : null}
          </span>
          <LeagueSeasonStartBadge leagueId={card.leagueId} />
        </div>
        <span className="overview-pace-meta">
          {formatCount(card.refCount)} refs · {card.seasonCount} seasons
        </span>
        {pending ? (
          <p className="overview-pace-pending">
            <ShieldAlert aria-hidden className="overview-pace-pending-icon" />
            {card.auditPendingLabel ?? "Pending Verification"} — detailed analytics locked
          </p>
        ) : null}
      </div>

      {pending ? null : (
        <>
          <div className="overview-pace-metric">
            <div className="overview-pace-metric-head">
              <span>{card.whistleLabel}</span>
              <strong>{formatLeaguePaceValue(card.whistlePerGame)}</strong>
            </div>
            <PaceBar leagueId={card.leagueId} track="whistle" rawValue={card.whistlePerGame} />
          </div>

          <div className="overview-pace-metric">
            <div className="overview-pace-metric-head">
              <span>{card.scoreLabel}</span>
              <strong>{formatLeaguePaceValue(card.scorePerGame)}</strong>
            </div>
            <PaceBar leagueId={card.leagueId} track="score" rawValue={card.scorePerGame} />
          </div>
        </>
      )}

      <span className="overview-pace-cta">
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
            <Link
              key={card.leagueId}
              href={card.auditHref ?? card.href}
              className="overview-pace-card overview-pace-card--pending"
              data-league={card.leagueId}
              data-verification="audit-in-progress"
            >
              <PaceCardBody card={card} />
            </Link>
          );
        }

        return (
          <Link
            key={card.leagueId}
            href={card.href}
            className="overview-pace-card"
            data-league={card.leagueId}
          >
            <PaceCardBody card={card} />
          </Link>
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
