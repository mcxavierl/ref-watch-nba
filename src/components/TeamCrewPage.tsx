import Link from "next/link";
import { OuLeanBadge } from "@/components/OuLeanBadge";
import { StatCell, StatSection, StatStrip } from "@/components/StatStrip";
import { WhistleBiasBadge } from "@/components/WhistleBiasBadge";
import {
  computeOuLean,
  formatDate,
  formatPct,
  formatSigned,
  getRefStats,
  sortSplitsByGames,
  whistleBias,
} from "@/lib/data";
import type { RefProfile, TeamCrewSplit } from "@/lib/types";

export interface TeamPageConfig {
  teamLabel: string;
  teamAbbr: string;
  accentClass: string;
  refLinkHoverClass: string;
  whistleTone: "raptors" | "lakers";
  splitsKey: "raptorsSplits" | "lakersSplits";
  methodologyTitle: string;
}

function winPct(wins: number, games: number): string {
  if (games === 0) return "—";
  return formatPct(wins / games);
}

function TeamSplitCard({
  split,
  leagueAvgTotal,
  leagueAvgFouls,
  overBaseline,
  refs,
  config,
}: {
  split: TeamCrewSplit;
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  overBaseline: number;
  refs: Pick<RefProfile, "slug" | "name">[];
  config: TeamPageConfig;
}) {
  const lean = computeOuLean(
    split.overRate,
    split.avgTotalPoints,
    leagueAvgTotal,
  );
  const bias = whistleBias(split.foulDifferential);
  const foulsDelta = Math.round((split.avgFouls - leagueAvgFouls) * 10) / 10;

  return (
    <article className="data-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-raised/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold leading-snug text-zinc-900">
            {split.crewNames.join(" · ")}
          </h2>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-600">
            {split.games} games · {split.wins}-{split.losses} (
            {winPct(split.wins, split.games)})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <OuLeanBadge lean={lean} />
          <WhistleBiasBadge
            bias={bias}
            diff={split.foulDifferential}
            teamAbbr={config.teamAbbr}
            teamTone={config.whistleTone}
          />
        </div>
      </div>

      <StatSection title="Pace & scoring">
        <StatStrip>
          <StatCell
            label="Avg total"
            value={String(split.avgTotalPoints)}
            detail={`${formatSigned(split.totalDelta)} vs ${leagueAvgTotal}`}
          />
          <StatCell
            label="Over rate"
            value={formatPct(split.overRate)}
            detail={`>${overBaseline} baseline`}
          />
          <StatCell
            label="Record"
            value={`${split.wins}-${split.losses}`}
            detail={`${winPct(split.wins, split.games)} win`}
          />
        </StatStrip>
      </StatSection>

      <StatSection title="Whistle & fouls">
        <StatStrip>
          <StatCell
            label="Combined"
            value={String(split.avgFouls)}
            detail={`${formatSigned(foulsDelta)} vs ${leagueAvgFouls}`}
          />
          <StatCell label={config.teamAbbr} value={String(split.avgTeamFouls)} />
          <StatCell label="Opponent" value={String(split.avgOpponentFouls)} />
          <StatCell
            label="Diff"
            value={formatSigned(split.foulDifferential)}
            detail={`${config.teamAbbr} − opp`}
          />
        </StatStrip>
      </StatSection>

      <StatSection title="Home / away">
        <StatStrip>
          <StatCell
            label="Home"
            value={`${split.homeWins}-${split.homeLosses}`}
            detail={`${split.homeGames}g`}
          />
          <StatCell
            label="Away"
            value={`${split.awayWins}-${split.awayLosses}`}
            detail={`${split.awayGames}g`}
          />
          <StatCell
            label="Home win"
            value={winPct(split.homeWins, split.homeGames)}
          />
          <StatCell
            label="Away win"
            value={winPct(split.awayWins, split.awayGames)}
          />
        </StatStrip>
      </StatSection>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border-subtle px-4 py-2.5">
        {split.crewNames.map((name) => {
          const ref = refs.find((r) => r.name === name);
          if (!ref) return null;
          return (
            <Link
              key={ref.slug}
              href={`/refs/${ref.slug}`}
              className={`text-[11px] text-zinc-600 transition ${config.refLinkHoverClass}`}
            >
              {name} →
            </Link>
          );
        })}
      </div>
    </article>
  );
}

export function TeamCrewPage({ config }: { config: TeamPageConfig }) {
  const stats = getRefStats();
  const splits = sortSplitsByGames(stats[config.splitsKey] ?? []);
  const totalGames = splits.reduce((s, sp) => s + sp.games, 0);
  const statsSeeded = stats.meta.source === "seeded";

  return (
    <div className="page-shell">
      <section className="mb-10">
        <p className={`text-sm font-semibold ${config.accentClass}`}>
          {config.teamLabel}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
          Ref crew splits
        </h1>
        <p className="page-lead">
          Crew-specific {config.teamLabel} history — not league-wide ref
          profiles. Each block covers every {config.teamAbbr} game this exact
          three-ref crew worked across {stats.meta.seasons.join(" & ")}. Sorted
          by sample size (most games first).
        </p>
        <p className="page-meta">
          <span
            className={statsSeeded ? "page-meta-seeded" : "page-meta-live"}
          >
            <span
              className={`size-1.5 rounded-full ${statsSeeded ? "bg-amber-500" : "bg-emerald-500"}`}
              aria-hidden
            />
            {statsSeeded ? "Seeded stats" : "Live stats"}
          </span>
          <span>Updated {formatDate(stats.meta.lastUpdated)}</span>
          <span>{stats.meta.source}</span>
          <span>{totalGames} games in sample</span>
        </p>
      </section>

      {splits.length === 0 ? (
        <div className="panel-inset px-6 py-8 text-center">
          <p className="text-base font-medium text-zinc-800">
            No {config.teamLabel} crew splits yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-border">
              npm run build-ref-data
            </code>{" "}
            to backfill historical crew splits from the NBA Stats API.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {splits.map((split) => (
            <TeamSplitCard
              key={split.crewKey}
              split={split}
              leagueAvgTotal={stats.meta.leagueAvgTotal}
              leagueAvgFouls={stats.meta.leagueAvgFouls}
              overBaseline={stats.meta.leagueOverBaseline}
              refs={stats.refs}
              config={config}
            />
          ))}
        </div>
      )}

      <details className="methodology-details panel-inset mt-10 px-5 py-4">
        <summary>{config.methodologyTitle}</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Pace & O/U</span> — avg
            combined score, over rate vs {stats.meta.leagueOverBaseline}{" "}
            baseline, and lean badge. Total delta vs league avg (
            {stats.meta.leagueAvgTotal}).
          </li>
          <li>
            <span className="font-medium text-zinc-800">Foul split</span> —
            personal fouls on {config.teamLabel} vs opponent per game.
            Differential ≥+1.5 favors {config.teamAbbr}, ≤−1.5 favors opponent.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Home / away</span> — W-L
            by location under this crew. Sub-5 game splits are directional only.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Win rate</span> —
            straight-up record with this crew (not ATS).
          </li>
        </ul>
        {stats.meta.note && (
          <p className="mt-3 text-xs text-zinc-600">{stats.meta.note}</p>
        )}
      </details>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          Qualified refs ({stats.meta.minSampleSize}+ games)
        </h2>
        <div className="data-card divide-y divide-border-subtle">
          {stats.refs
            .filter((r) => r.games >= stats.meta.minSampleSize)
            .slice(0, 12)
            .map((ref) => (
              <Link
                key={ref.slug}
                href={`/refs/${ref.slug}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-800">{ref.name}</span>
                <span className="font-mono text-xs tabular-nums text-zinc-600">
                  O/U {formatPct(ref.overRate)}
                </span>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
