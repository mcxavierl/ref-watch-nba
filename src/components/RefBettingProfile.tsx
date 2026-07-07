import type { MetricProvenance, RefBettingStats, RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { formatPctFromWlp, formatWlp } from "@/lib/ref-betting";
import { TermHeading, TermHelp } from "@/components/TermHelp";
import { ProvenanceMarker } from "@/components/ProvenanceMarker";
import { SampleGateBadge } from "@/components/SampleGateBadge";
import { StatCell, StatStrip } from "./StatStrip";

function WlpCell({
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
  return (
    <StatCell
      label={
        termId ? (
          <TermHelp id={termId}>{label}</TermHelp>
        ) : (
          label
        )
      }
      value={formatWlp(record.wins, record.losses, record.pushes)}
      detail={formatPctFromWlp(record.wins, record.losses, record.pushes)}
      provenance={provenance}
      annotation={belowGate ? "Below bucket sample gate" : undefined}
    />
  );
}

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
}: {
  profile: RefProfile;
  stats: RefBettingStats;
}) {
  const ou = stats.overUnder;
  const prov = stats.provenance;
  const bucketGate = prov?.bucketGateThreshold ?? 5;

  return (
    <div className="space-y-4">
      {prov && (
        <div className="flex flex-wrap items-center gap-2">
          <ProvenanceMarker provenance={prov.lines} />
          {profile.provenance?.sampleGate && (
            <SampleGateBadge gate={profile.provenance.sampleGate} />
          )}
        </div>
      )}
      <section className="data-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-800">General</h2>
          <p className="mt-1 text-sm text-zinc-600">
            <TermHelp id="closing-line" /> Records use per-game closing lines
            where available.
          </p>
        </div>
        <StatStrip>
          <StatCell label="Games" value={String(profile.games)} />
          <WlpCell
            label="Home team W/L"
            termId="home-team-wl"
            record={stats.homeTeamRecord}
          />
          <WlpCell
            label="Home team ATS"
            termId="ats"
            record={stats.homeTeamAts}
            provenance={prov?.homeTeamAts}
          />
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
            label={<TermHelp id="home-margin">Home avg margin</TermHelp>}
            value={String(stats.avgHomeMargin)}
          />
        </StatStrip>
        <StatStrip>
          <StatCell
            label="Avg total score"
            value={String(profile.avgTotalPoints)}
            detail={`${profile.totalPointsDelta >= 0 ? "+" : ""}${profile.totalPointsDelta} vs league`}
            provenance={profile.provenance?.avgTotalPoints}
          />
          <StatCell
            label="Fouls per game"
            value={String(profile.avgFouls)}
            detail={`${profile.foulsDelta >= 0 ? "+" : ""}${profile.foulsDelta} vs league`}
            provenance={profile.provenance?.avgFouls}
          />
          <StatCell
            label={<TermHelp id="over-225">Over rate (225 proxy)</TermHelp>}
            value={formatPct(profile.overRate)}
            provenance={profile.provenance?.overRate}
          />
        </StatStrip>
      </section>

      <section className="data-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <TermHeading id="over-under" />
            {prov && <ProvenanceMarker provenance={prov.overUnder} compact />}
          </div>
        </div>
        <StatStrip>
          <WlpCell label="Overall" record={ou.overall} />
        </StatStrip>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border-subtle bg-zinc-50/80 text-left text-zinc-600">
                <th className="px-4 py-2 font-medium sm:px-5">
                  <TermHelp id="ou-bucket">Line range</TermHelp>
                </th>
                <th className="px-4 py-2 font-medium">Record</th>
                <th className="px-4 py-2 font-medium">
                  <TermHelp id="hit-rate">Hit rate</TermHelp>
                </th>
              </tr>
            </thead>
            <tbody>
              {ou.buckets.map((bucket) => {
                const games = bucketGames(bucket.record);
                const belowGate = games < bucketGate;
                return (
                <tr
                  key={bucket.label}
                  className={`border-t border-border-subtle ${belowGate ? "bg-amber-50/40" : ""}`}
                >
                  <td className="px-4 py-2.5 text-zinc-800 sm:px-5">
                    {bucket.label}
                    {belowGate && (
                      <span className="ml-2">
                        <SampleGateBadge
                          gate={{
                            sampleSize: games,
                            gateThreshold: bucketGate,
                            cleared: false,
                            label: `${games}/${bucketGate} games — below threshold`,
                          }}
                          className="align-middle"
                        />
                      </span>
                    )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-800">
            <TermHelp id="ats-split">
              Spread — home favorite / underdog
            </TermHelp>
            {prov && <ProvenanceMarker provenance={prov.spreadBuckets} compact />}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-zinc-50/80 text-left text-zinc-600">
                <th className="px-4 py-2 font-medium sm:px-5">Spread</th>
                <th className="px-4 py-2 font-medium">
                  <TermHelp id="home-fav">Home fav</TermHelp>
                </th>
                <th className="px-4 py-2 font-medium">
                  <TermHelp id="home-dog">Home dog</TermHelp>
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.spreadBuckets.map((bucket) => {
                const favGames = bucketGames(bucket.homeFavorite);
                const dogGames = bucketGames(bucket.homeUnderdog);
                const belowGate =
                  favGames < bucketGate || dogGames < bucketGate;
                return (
                <tr
                  key={bucket.label}
                  className={`border-t border-border-subtle ${belowGate ? "bg-amber-50/40" : ""}`}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
