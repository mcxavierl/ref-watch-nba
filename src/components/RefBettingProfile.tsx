import type { RefBettingStats, RefProfile } from "@/lib/types";
import { formatPctFromWlp, formatWlp } from "@/lib/ref-betting";
import { buildRefTeamPerformanceTrends } from "@/lib/ref-team-performance-trends";
import type { LeagueId } from "@/lib/leagues";
import { TermHeading, TermHelp } from "@/components/TermHelp";
import {
  RefProfileQuickStatsBar,
  RefProfileSecondaryStats,
} from "@/components/ref-profile/RefProfileQuickStatsBar";
import { RefProfileTrendCards } from "@/components/ref-profile/RefProfileTrendCards";
import { RefProfileTeamTrends } from "@/components/ref-profile/RefProfileTeamTrends";

function bucketGames(record: {
  wins: number;
  losses: number;
  pushes: number;
}): number {
  return record.wins + record.losses + record.pushes;
}

export function RefBettingProfile({
  profile,
  stats,
  leagueId,
  showMetrics = true,
}: {
  profile: RefProfile;
  stats: RefBettingStats;
  leagueId: LeagueId;
  showMetrics?: boolean;
}) {
  const ou = stats.overUnder;
  const bucketGate = stats.provenance?.bucketGateThreshold ?? 5;
  const teamTrends = buildRefTeamPerformanceTrends(profile);

  if (!showMetrics) {
    return (
      <section className="ref-profile-section px-6 py-6">
        <p className="text-sm font-normal text-slate-400">
          Not enough games for reliable metrics yet ({profile.games} logged).
          Betting splits and closing-line context appear after the sample gate clears.
        </p>
      </section>
    );
  }

  return (
    <div className="ref-profile-betting-dashboard">
      <RefProfileQuickStatsBar profile={profile} stats={stats} />
      <RefProfileTrendCards stats={stats} />
      <RefProfileSecondaryStats profile={profile} />
      <RefProfileTeamTrends
        best={teamTrends.best}
        worst={teamTrends.worst}
        leagueId={leagueId}
      />

      <section className="ref-profile-section">
        <div className="ref-table-section-header">
          <TermHeading id="over-under" as="h2" className="font-semibold tracking-tight" />
        </div>
        <div className="ref-table-section-body overflow-x-auto">
          <table className="ref-data-table data-table min-w-[28rem] w-full">
            <thead>
              <tr className="data-table-head">
                <th>
                  <TermHelp id="ou-bucket">Line range</TermHelp>
                </th>
                <th>Record</th>
                <th>
                  <TermHelp id="hit-rate">Hit rate</TermHelp>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-sm font-medium text-zinc-800">Overall</td>
                <td className="font-tabular tabular-nums text-zinc-800">
                  {formatWlp(ou.overall.wins, ou.overall.losses, ou.overall.pushes)}
                </td>
                <td className="font-tabular tabular-nums text-zinc-600">
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
                    <td className="font-tabular tabular-nums text-zinc-800">
                      {belowGate
                        ? "-"
                        : formatWlp(
                            bucket.record.wins,
                            bucket.record.losses,
                            bucket.record.pushes,
                          )}
                    </td>
                    <td className="font-tabular tabular-nums text-zinc-600">
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
      </section>

      <section className="ref-profile-section">
        <div className="ref-table-section-header">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold tracking-tight">
            <TermHelp id="ats-split">Spread: home favorite / underdog</TermHelp>
          </h2>
        </div>
        <div className="ref-table-section-body overflow-x-auto">
          <table className="ref-data-table data-table min-w-[28rem] w-full">
            <thead>
              <tr className="data-table-head">
                <th>Spread</th>
                <th>
                  <TermHelp id="home-fav">Home fav</TermHelp>
                </th>
                <th>
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
                    <td className="font-tabular tabular-nums text-zinc-800">
                      {favGames < bucketGate
                        ? "-"
                        : formatWlp(
                            bucket.homeFavorite.wins,
                            bucket.homeFavorite.losses,
                            bucket.homeFavorite.pushes,
                          )}
                    </td>
                    <td className="font-tabular tabular-nums text-zinc-800">
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
      </section>
    </div>
  );
}
