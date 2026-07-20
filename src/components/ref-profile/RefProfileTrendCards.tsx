import { TermHelp } from "@/components/TermHelp";
import { StatCardShareButton } from "@/components/StatCardShareButton";
import { STAT_CARD_ANCHOR } from "@/lib/stat-card-id";
import type { RefBettingStats } from "@/lib/types";
import { formatPctFromWlp, formatWlp } from "@/lib/ref-betting";
import { formatPct } from "@/lib/data";

function rateFromRecord(record: {
  wins: number;
  losses: number;
  pushes: number;
}): number {
  const total = record.wins + record.losses + record.pushes;
  if (total === 0) return 0;
  return record.wins / total;
}

function TrendProgressBar({
  rate,
  tone,
}: {
  rate: number;
  tone: "brand" | "gold";
}) {
  const pct = Math.max(0, Math.min(100, rate * 100));
  return (
    <div
      className={`ref-profile-trend-progress ref-profile-trend-progress--${tone}`}
      role="presentation"
      aria-hidden
    >
      <span
        className="ref-profile-trend-progress-fill"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TrendCard({
  title,
  termId,
  record,
  rateLabel,
  rate,
  tone,
  shareId,
}: {
  title: string;
  termId: "home-team-wl" | "ats";
  record: { wins: number; losses: number; pushes: number };
  rateLabel: string;
  rate: number;
  tone: "brand" | "gold";
  shareId: string;
}) {
  const games = record.wins + record.losses + record.pushes;

  return (
    <article
      id={shareId}
      data-stat-card="true"
      className="ref-profile-trend-card stat-card h-fit"
    >
      <header className="ref-profile-trend-card-head">
        <TermHelp id={termId}>{title}</TermHelp>
        <StatCardShareButton hashId={shareId} label={title} />
      </header>
      <p className="ref-profile-trend-record text-right tabular-nums">
        {games === 0 ? "-" : formatWlp(record.wins, record.losses, record.pushes)}
      </p>
      <div className="ref-profile-trend-rate-row gap-2">
        <span className="ref-profile-trend-rate-pill whitespace-nowrap px-3 tabular-nums">
          {rateLabel}
        </span>
      </div>
      <TrendProgressBar rate={rate} tone={tone} />
    </article>
  );
}

export function RefProfileTrendCards({ stats }: { stats: RefBettingStats }) {
  const homeWlRate = rateFromRecord(stats.homeTeamRecord);
  const atsRate = rateFromRecord(stats.homeTeamAts);

  return (
    <section className="ref-profile-trend-grid" aria-label="Home team trends">
      <TrendCard
        title="Home team W/L"
        termId="home-team-wl"
        shareId={STAT_CARD_ANCHOR.trend.homeTeamWl}
        record={stats.homeTeamRecord}
        rateLabel={`${(homeWlRate * 100).toFixed(1)}% home win rate`}
        rate={homeWlRate}
        tone="brand"
      />
      <TrendCard
        title="Home team ATS"
        termId="ats"
        shareId={STAT_CARD_ANCHOR.trend.homeTeamAts}
        record={stats.homeTeamAts}
        rateLabel={`${(atsRate * 100).toFixed(1)}% ATS`}
        rate={atsRate}
        tone="gold"
      />
    </section>
  );
}
