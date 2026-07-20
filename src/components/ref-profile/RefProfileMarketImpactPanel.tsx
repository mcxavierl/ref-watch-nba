"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import {
  RefProfileQuickStatsBar,
  RefProfileSecondaryStats,
} from "@/components/ref-profile/RefProfileQuickStatsBar";
import { TermHelp } from "@/components/TermHelp";
import type { LeagueId } from "@/lib/leagues";
import type { RefBettingStats, RefProfile } from "@/lib/types";
import { formatPctFromWlp, formatWlp } from "@/lib/ref-betting";

type MarketImpactTab = "wl" | "ats" | "ou";

function bucketGames(record: {
  wins: number;
  losses: number;
  pushes: number;
}): number {
  return record.wins + record.losses + record.pushes;
}

function MarketWlPanel({ stats }: { stats: RefBettingStats }) {
  const record = stats.homeTeamRecord;
  const games = bucketGames(record);
  const rate =
    games > 0 ? ((record.wins / games) * 100).toFixed(1) : "0.0";

  return (
    <div className="ref-market-impact-panel">
      <p className="ref-market-impact-lead">
        Straight-up home team record when this official works the game.
      </p>
      <div className="ref-profile-trend-grid ref-profile-trend-grid--single">
        <article className="ref-profile-trend-card">
          <header className="ref-profile-trend-card-head">
            <TermHelp id="home-team-wl">Home team W/L</TermHelp>
          </header>
          <p className="ref-profile-trend-record tabular-nums text-right">
            {games === 0 ? "-" : formatWlp(record.wins, record.losses, record.pushes)}
          </p>
          <p className="ref-market-impact-meta tabular-nums text-right text-slate-400">{rate}% home win rate</p>
        </article>
      </div>
    </div>
  );
}

function MarketAtsPanel({ stats }: { stats: RefBettingStats }) {
  const bucketGate = stats.provenance?.bucketGateThreshold ?? 5;
  const record = stats.homeTeamAts;
  const games = bucketGames(record);
  const rate =
    games > 0 ? ((record.wins / games) * 100).toFixed(1) : "0.0";

  return (
    <div className="ref-market-impact-panel">
      <div className="ref-profile-trend-grid ref-profile-trend-grid--single">
        <article className="ref-profile-trend-card">
          <header className="ref-profile-trend-card-head">
            <TermHelp id="ats">Home team ATS</TermHelp>
          </header>
          <p className="ref-profile-trend-record tabular-nums text-right">
            {games === 0 ? "-" : formatWlp(record.wins, record.losses, record.pushes)}
          </p>
          <p className="ref-market-impact-meta tabular-nums text-right text-slate-400">{rate}% ATS cover rate</p>
        </article>
      </div>
      <div className="ref-table-section-body mt-4 overflow-x-auto stat-data-container master-table-scroll">
        <table className="ref-data-table data-table min-w-[28rem] w-full">
          <thead>
            <tr className="data-table-head">
              <th>Spread</th>
              <th className="data-table-num">
                <TermHelp id="home-fav">Home fav</TermHelp>
              </th>
              <th className="data-table-num">
                <TermHelp id="home-dog">Home dog</TermHelp>
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.spreadBuckets.map((bucket) => {
              const favGames = bucketGames(bucket.homeFavorite);
              const dogGames = bucketGames(bucket.homeUnderdog);
              return (
                <tr key={bucket.label}>
                  <td className="text-sm text-zinc-800">{bucket.label}</td>
                  <td className="data-table-num font-tabular tabular-nums text-zinc-800">
                    {favGames < bucketGate
                      ? "-"
                      : formatWlp(
                          bucket.homeFavorite.wins,
                          bucket.homeFavorite.losses,
                          bucket.homeFavorite.pushes,
                        )}
                  </td>
                  <td className="data-table-num font-tabular tabular-nums text-zinc-800">
                    {dogGames < bucketGate
                      ? "-"
                      : formatWlp(
                          bucket.homeUnderdog.wins,
                          bucket.homeUnderdog.losses,
                          bucket.homeUnderdog.pushes,
                        )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarketOuPanel({ stats }: { stats: RefBettingStats }) {
  const ou = stats.overUnder;
  const bucketGate = stats.provenance?.bucketGateThreshold ?? 5;

  return (
    <div className="ref-market-impact-panel">
      <div className="ref-table-section-body overflow-x-auto">
        <table className="ref-data-table data-table min-w-[28rem] w-full">
          <thead>
            <tr className="data-table-head">
              <th>
                <TermHelp id="ou-bucket">Line range</TermHelp>
              </th>
              <th className="data-table-num">Record</th>
              <th className="data-table-num">
                <TermHelp id="hit-rate">Hit rate</TermHelp>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-sm font-medium text-zinc-800">Overall</td>
              <td className="data-table-num font-tabular tabular-nums text-zinc-800">
                {formatWlp(ou.overall.wins, ou.overall.losses, ou.overall.pushes)}
              </td>
              <td className="data-table-num font-tabular tabular-nums text-zinc-600">
                {formatPctFromWlp(
                  ou.overall.wins,
                  ou.overall.losses,
                  ou.overall.pushes,
                )}
              </td>
            </tr>
            {ou.buckets.map((bucket) => {
              const games = bucketGames(bucket.record);
              const belowGate = games < bucketGate;
              return (
                <tr key={bucket.label}>
                  <td className="text-sm text-zinc-800">{bucket.label}</td>
                  <td className="data-table-num font-tabular tabular-nums text-zinc-800">
                    {belowGate
                      ? "-"
                      : formatWlp(
                          bucket.record.wins,
                          bucket.record.losses,
                          bucket.record.pushes,
                        )}
                  </td>
                  <td className="data-table-num font-tabular tabular-nums text-zinc-600">
                    {belowGate
                      ? "-"
                      : formatPctFromWlp(
                          bucket.record.wins,
                          bucket.record.losses,
                          bucket.record.pushes,
                        )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tabbed W/L, ATS, and Over/Under market impact for ref profiles. */
export function RefProfileMarketImpactPanel({
  profile,
  stats,
  leagueId,
  showMetrics = true,
  hideWhistleMetrics = false,
}: {
  profile: RefProfile;
  stats: RefBettingStats;
  leagueId: LeagueId;
  showMetrics?: boolean;
  hideWhistleMetrics?: boolean;
}) {
  const [tab, setTab] = useState<MarketImpactTab>("wl");

  if (!showMetrics) {
    return (
      <section className="ref-profile-section ref-market-impact px-6 py-6">
        <h2 className="ref-profile-section-title">Market Impact</h2>
        <p className="text-sm font-normal text-slate-400">
          Not enough games for reliable metrics yet (N={profile.games}). Market splits appear
          after the sample gate clears.
        </p>
      </section>
    );
  }

  return (
    <section className="ref-profile-section ref-market-impact" aria-labelledby="ref-market-impact-title">
      <div className="ref-table-section-header flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 id="ref-market-impact-title" className="ref-profile-section-title m-0">
          Market Impact
        </h2>
        <div className="ref-market-impact-tabs flex min-w-0 flex-wrap gap-2">
          <Pill
            as="button"
            variant="insight"
            active={tab === "wl"}
            onClick={() => setTab("wl")}
            aria-pressed={tab === "wl"}
          >
            Team W/L
          </Pill>
          <Pill
            as="button"
            variant="insight"
            active={tab === "ats"}
            onClick={() => setTab("ats")}
            aria-pressed={tab === "ats"}
          >
            ATS
          </Pill>
          <Pill
            as="button"
            variant="insight"
            active={tab === "ou"}
            onClick={() => setTab("ou")}
            aria-pressed={tab === "ou"}
          >
            Over/Under
          </Pill>
        </div>
      </div>

      <div className="ref-table-section-body">
        <RefProfileQuickStatsBar profile={profile} stats={stats} />
        {tab === "wl" ? <MarketWlPanel stats={stats} /> : null}
        {tab === "ats" ? <MarketAtsPanel stats={stats} /> : null}
        {tab === "ou" ? (
          <>
            <MarketOuPanel stats={stats} />
            <RefProfileSecondaryStats
              profile={profile}
              hideWhistleMetrics={hideWhistleMetrics}
              leagueId={leagueId}
            />
          </>
        ) : null}
        <p className="ref-market-impact-sample mt-3 text-xs text-slate-400">
          N={profile.games.toLocaleString()} games · {leagueId.toUpperCase()} sample
        </p>
      </div>
    </section>
  );
}
