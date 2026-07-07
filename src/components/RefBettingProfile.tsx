import type { RefBettingStats, RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { formatPctFromWlp, formatWlp } from "@/lib/ref-betting";
import { StatCell, StatStrip } from "./StatStrip";

function WlpCell({
  label,
  record,
}: {
  label: string;
  record: { wins: number; losses: number; pushes: number };
}) {
  return (
    <StatCell
      label={label}
      value={formatWlp(record.wins, record.losses, record.pushes)}
      detail={formatPctFromWlp(record.wins, record.losses, record.pushes)}
    />
  );
}

export function RefBettingProfile({
  profile,
  stats,
}: {
  profile: RefProfile;
  stats: RefBettingStats;
}) {
  const ou = stats.overUnder;

  return (
    <div className="space-y-4">
      <section className="data-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-800">General</h2>
          {!stats.linesAvailable && (
            <p className="mt-1 text-sm text-zinc-500">
              Closing lines unavailable for this profile.
            </p>
          )}
        </div>
        <StatStrip>
          <StatCell label="Games" value={String(profile.games)} />
          <WlpCell label="Home team W/L" record={stats.homeTeamRecord} />
          <WlpCell label="Home team ATS" record={stats.homeTeamAts} />
        </StatStrip>
        <StatStrip>
          <StatCell
            label="Avg home score"
            value={String(stats.avgHomeScore)}
          />
          <StatCell
            label="Avg road score"
            value={String(stats.avgRoadScore)}
          />
          <StatCell
            label="Home avg margin"
            value={String(stats.avgHomeMargin)}
            detail="Points per game"
          />
        </StatStrip>
        <StatStrip>
          <StatCell
            label="Avg total score"
            value={String(profile.avgTotalPoints)}
            detail={`${profile.totalPointsDelta >= 0 ? "+" : ""}${profile.totalPointsDelta} vs league`}
          />
          <StatCell
            label="Fouls per game"
            value={String(profile.avgFouls)}
            detail={`${profile.foulsDelta >= 0 ? "+" : ""}${profile.foulsDelta} vs league`}
          />
          <StatCell
            label="Over rate (225 proxy)"
            value={formatPct(profile.overRate)}
            detail="Legacy benchmark"
          />
        </StatStrip>
      </section>

      <section className="data-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-800">Over / under</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Versus closing total on each game (not the 225 proxy).
          </p>
        </div>
        <StatStrip>
          <WlpCell label="Overall" record={ou.overall} />
        </StatStrip>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border-subtle bg-zinc-50/80 text-left text-zinc-600">
                <th className="px-4 py-2 font-medium sm:px-5">Line range</th>
                <th className="px-4 py-2 font-medium">Record</th>
                <th className="px-4 py-2 font-medium">Hit rate</th>
              </tr>
            </thead>
            <tbody>
              {ou.buckets.map((bucket) => (
                <tr
                  key={bucket.label}
                  className="border-t border-border-subtle"
                >
                  <td className="px-4 py-2.5 text-zinc-800 sm:px-5">
                    {bucket.label}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-zinc-800">
                    {formatWlp(
                      bucket.record.wins,
                      bucket.record.losses,
                      bucket.record.pushes,
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-zinc-600">
                    {formatPctFromWlp(
                      bucket.record.wins,
                      bucket.record.losses,
                      bucket.record.pushes,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-800">
            Spread — home favorite / underdog
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-zinc-50/80 text-left text-zinc-600">
                <th className="px-4 py-2 font-medium sm:px-5">Spread</th>
                <th className="px-4 py-2 font-medium">Home fav</th>
                <th className="px-4 py-2 font-medium">Home dog</th>
              </tr>
            </thead>
            <tbody>
              {stats.spreadBuckets.map((bucket) => (
                <tr
                  key={bucket.label}
                  className="border-t border-border-subtle"
                >
                  <td className="px-4 py-2.5 text-zinc-800 sm:px-5">
                    {bucket.label}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-zinc-800">
                    {formatWlp(
                      bucket.homeFavorite.wins,
                      bucket.homeFavorite.losses,
                      bucket.homeFavorite.pushes,
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-zinc-800">
                    {formatWlp(
                      bucket.homeUnderdog.wins,
                      bucket.homeUnderdog.losses,
                      bucket.homeUnderdog.pushes,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
