import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { PRIMARY_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";

type OverviewComparativeScorecardProps = {
  cards: LeagueOverviewCard[];
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function formatMetric(value: number): string {
  return value.toFixed(1);
}

/** Minimal sparkline from a normalized pace value (0–1). */
function sparklinePath(normalized: number): string {
  const peak = Math.min(1, Math.max(0.12, normalized));
  const points = [
    [2, 14 - peak * 10 * 0.65],
    [14, 14 - peak * 10 * 0.82],
    [26, 14 - peak * 10 * 0.74],
    [38, 14 - peak * 10 * 0.9],
    [50, 14 - peak * 10],
  ];
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
}

function Sparkline({
  normalized,
  tone,
}: {
  normalized: number;
  tone: "whistle" | "score";
}) {
  const path = sparklinePath(normalized);

  return (
    <svg
      className={`overview-scorecard-sparkline overview-scorecard-sparkline--${tone}`}
      viewBox="0 0 52 16"
      aria-hidden
    >
      <path className="overview-scorecard-sparkline-line" d={path} />
      <circle
        className="overview-scorecard-sparkline-dot"
        cx="50"
        cy={14 - Math.min(1, Math.max(0.12, normalized)) * 10}
        r="2"
      />
    </svg>
  );
}

function ScorecardRow({ card }: { card: LeagueOverviewCard }) {
  return (
    <Link
      href={card.href}
      className="overview-scorecard-row"
      data-league={card.leagueId}
    >
      <span className="overview-scorecard-league">
        <span className="overview-scorecard-league-label">{card.shortLabel}</span>
        <span className="overview-scorecard-league-meta">
          {formatCount(card.refCount)} refs
        </span>
      </span>

      <span className="overview-scorecard-metric">
        <span className="overview-scorecard-metric-label">{card.whistleLabel}</span>
        <Sparkline normalized={card.whistleBar} tone="whistle" />
        <strong className="overview-scorecard-metric-value">
          {formatMetric(card.whistlePerGame)}
        </strong>
      </span>

      <span className="overview-scorecard-metric">
        <span className="overview-scorecard-metric-label">{card.scoreLabel}</span>
        <Sparkline normalized={card.scoreBar} tone="score" />
        <strong className="overview-scorecard-metric-value">
          {formatMetric(card.scorePerGame)}
        </strong>
      </span>

      <span className="overview-scorecard-cta" aria-hidden>
        <ArrowRight />
      </span>
    </Link>
  );
}

export function OverviewComparativeScorecard({ cards }: OverviewComparativeScorecardProps) {
  const order = new Map<LeagueId, number>(
    PRIMARY_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );

  const liveCards = cards
    .filter(
      (card) =>
        isDashboardLeagueExposed(card.leagueId) &&
        (PRIMARY_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(card.leagueId),
    )
    .sort((a, b) => (order.get(a.leagueId) ?? 99) - (order.get(b.leagueId) ?? 99));

  if (liveCards.length === 0) return null;

  return (
    <div className="overview-scorecard">
      <div className="overview-scorecard-section overview-scorecard-section--live">
        <div className="overview-scorecard-section-head">
          <h3 className="overview-scorecard-section-title">Live competitions</h3>
          <p className="overview-scorecard-section-hint">
            Normalized whistle and scoring pace across verified live leagues.
          </p>
        </div>
        <div className="overview-scorecard-rows" role="list">
          {liveCards.map((card) => (
            <ScorecardRow key={card.leagueId} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
