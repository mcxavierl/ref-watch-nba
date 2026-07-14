import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import {
  formatLeaguePaceValue,
  isLeaguePaceMetricZero,
  paceBarWidthPercent,
  sortLeaguePaceCards,
} from "@/lib/league-pace-bars";

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
  return (
    <>
      <div className="overview-pace-card-head">
        <div className="league-header league-header--compact">
          <span className="overview-pace-label-row">
            <span className="overview-pace-label">{card.shortLabel}</span>
          </span>
          <LeagueSeasonStartBadge leagueId={card.leagueId} />
        </div>
        <span className="overview-pace-meta">
          {formatCount(card.refCount)} refs · {card.seasonCount} seasons
        </span>
      </div>

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

      <span className="overview-pace-cta">
        Open hub <ArrowRight aria-hidden />
      </span>
    </>
  );
}

export function OverviewLeaguePaceGrid({ cards }: { cards: LeagueOverviewCard[] }) {
  const orderedCards = sortLeaguePaceCards(
    cards.filter((card) => isDashboardLeagueExposed(card.leagueId)),
  );

  if (orderedCards.length === 0) return null;

  return (
    <div className="overview-pace-grid grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {orderedCards.map((card) => (
        <Link
          key={card.leagueId}
          href={card.href}
          className="overview-pace-card"
          data-league={card.leagueId}
        >
          <PaceCardBody card={card} />
        </Link>
      ))}
    </div>
  );
}
