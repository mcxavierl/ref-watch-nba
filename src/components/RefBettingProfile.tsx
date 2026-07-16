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
      <section className="data-card px-4 py-6 sm:px-5">
        <p className="text-sm text-zinc-600">
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

      <section className="ref-profile-data-card">
        <header className="ref-profile-data-card-head">
          <TermHeading id="over-under" as="h2" className="ref-profile-section-title" />
        </header>
        <div className="ref-profile-table-wrap">
          <table className="ref-data-table data-table ref-profile-compact-table">
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
                <td className="font-medium">Overall</td>
                <td className="font-mono tabular-nums">
                  {formatWlp(ou.overall.wins, ou.overall.losses, ou.overall.pushes)}
                </td>
                <td className="font-mono tabular-nums">
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
                    <td>{bucket.label}</td>
                    <td className="font-mono tabular-nums">
                      {belowGate
                        ? "-"
                        : formatWlp(
                            bucket.record.wins,
                            bucket.record.losses,
                            bucket.record.pushes,
                          )}
                    </td>
                    <td className="font-mono tabular-nums">
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

      <section className="ref-profile-data-card">
        <header className="ref-profile-data-card-head">
          <h2 className="ref-profile-section-title">
            <TermHelp id="ats-split">Spread: home favorite / underdog</TermHelp>
          </h2>
        </header>
        <div className="ref-profile-table-wrap">
          <table className="ref-data-table data-table ref-profile-compact-table">
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
                    <td>{bucket.label}</td>
                    <td className="font-mono tabular-nums">
                      {favGames < bucketGate
                        ? "-"
                        : formatWlp(
                            bucket.homeFavorite.wins,
                            bucket.homeFavorite.losses,
                            bucket.homeFavorite.pushes,
                          )}
                    </td>
                    <td className="font-mono tabular-nums">
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
