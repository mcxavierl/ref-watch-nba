import type { MetricProvenance, RefBettingStats, RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { formatSigned } from "@/lib/stats-utils";
import { formatPctFromWlp, formatWlp } from "@/lib/ref-betting";
import { TermHeading, TermHelp } from "@/components/TermHelp";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "@/components/RefDashboardStatGrid";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */

function bucketGames(record: {
  wins: number;
  losses: number;
  pushes: number;
}): number {
  return record.wins + record.losses + record.pushes;
}

function WlpStatCell({
  label,
  termId,
  record,
  provenance,
  belowGate,
}: {
  label: string;
  termId?: "ats" | "home-team-wl" | "hit-rate";
  record: { wins: number; losses: number; pushes: number };
  provenance?: MetricProvenance;
  belowGate?: boolean;
}) {
  const games = bucketGames(record);
  const hidden = belowGate || games === 0;

  return (
    <RefDashboardStatCell
      label={
        termId ? (
          <TermHelp id={termId}>{label}</TermHelp>
        ) : (
          label
        )
      }
      value={hidden ? "-" : formatWlp(record.wins, record.losses, record.pushes)}
      detail={
        hidden
          ? undefined
          : formatPctFromWlp(record.wins, record.losses, record.pushes)
      }
      provenance={provenance}
    />
  );
}

export function RefBettingProfile({
  profile,
  stats,
  showMetrics = true,
}: {
  profile: RefProfile;
  stats: RefBettingStats;
  showMetrics?: boolean;
}) {
  const ou = stats.overUnder;
  const prov = stats.provenance;
  const bucketGate = prov?.bucketGateThreshold ?? 5;

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
    <>
      <section className="data-card">
        <div className="ref-table-section-header">
          <h2 className="text-sm font-semibold text-zinc-800">Historical tendency</h2>
          <p className="mt-1 text-sm text-primary-muted">
            Scoring and foul rates from verified game logs. Over rate uses a fixed
            benchmark proxy, not live sportsbook lines.
          </p>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <RefDashboardStatGrid>
            <RefDashboardStatCell label="Games" value={String(profile.games)} />
            <WlpStatCell
              label="Home team W/L"
              termId="home-team-wl"
              record={stats.homeTeamRecord}
            />
            <WlpStatCell
              label="Home team ATS"
              termId="ats"
              record={stats.homeTeamAts}
              provenance={prov?.homeTeamAts}
            />
            <RefDashboardStatCell
              label="Avg home score"
              value={String(stats.avgHomeScore)}
            />
            <RefDashboardStatCell
              label="Avg road score"
              value={String(stats.avgRoadScore)}
            />
            <RefDashboardStatCell
              label={<TermHelp id="home-margin">Home avg margin</TermHelp>}
              value={String(stats.avgHomeMargin)}
            />
            <RefDashboardStatCell
              label="Avg total score"
              value={String(profile.avgTotalPoints)}
              detail={`${formatSigned(profile.totalPointsDelta)} vs league`}
              detailMuted
              provenance={profile.provenance?.avgTotalPoints}
            />
            <RefDashboardStatCell
              label="Fouls per game"
              value={String(profile.avgFouls)}
              detail={`${formatSigned(profile.foulsDelta)} vs league`}
              detailMuted
              provenance={profile.provenance?.avgFouls}
            />
            <RefDashboardStatCell
              label={<TermHelp id="over-225">Over rate (225 proxy)</TermHelp>}
              value={formatPct(profile.overRate)}
              detail="Historical tendency, not sportsbook O/U"
              detailMuted
              provenance={profile.provenance?.overRate}
            />
          </RefDashboardStatGrid>
        </div>
      </section>

      <section className="data-card">
        <div className="ref-table-section-header">
          <TermHeading id="over-under" />
          <p className="mt-1 text-sm text-primary-muted">
            Sportsbook closing totals where matched. Estimated lines elsewhere.
          </p>
        </div>
        <div className="overflow-x-auto">
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
                <td className="font-mono tabular-nums text-zinc-800">
                  {formatWlp(ou.overall.wins, ou.overall.losses, ou.overall.pushes)}
                </td>
                <td className="font-mono tabular-nums text-zinc-600">
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
                    <td className="font-mono tabular-nums text-zinc-800">
                      {belowGate
                        ? "-"
                        : formatWlp(
                            bucket.record.wins,
                            bucket.record.losses,
                            bucket.record.pushes,
                          )}
                    </td>
                    <td className="font-mono tabular-nums text-zinc-600">
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

      <section className="data-card">
        <div className="ref-table-section-header">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-800">
            <TermHelp id="ats-split">
              Spread: home favorite / underdog
            </TermHelp>
          </h2>
          <p className="mt-1 text-sm text-primary-muted">
            ATS splits from per-game closing spreads. Historical sportsbook data only.
          </p>
        </div>
        <div className="overflow-x-auto">
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
                    <td className="font-mono tabular-nums text-zinc-800">
                      {favGames < bucketGate
                        ? "-"
                        : formatWlp(
                            bucket.homeFavorite.wins,
                            bucket.homeFavorite.losses,
                            bucket.homeFavorite.pushes,
                          )}
                    </td>
                    <td className="font-mono tabular-nums text-zinc-800">
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
    </>
  );
}
