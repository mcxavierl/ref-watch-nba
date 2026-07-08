import Link from "next/link";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import {
  formatRefStatsRange,
  getRefStats,
  getTeamSplits,
} from "@/lib/cfb/data";
import { hubPageMetadata } from "@/lib/seo";

export const metadata = hubPageMetadata("cfb", "matrix");
import { LEAGUES } from "@/lib/leagues";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { isCfbSimulatedData } from "@/lib/cfb/data-source";
import { CFB_TEAMS, teamFullName } from "@/lib/cfb/teams";

export default function CfbMatrixPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = isCfbSimulatedData(stats.meta.source);
  const espn = stats.meta.source === "espn";
  const league = LEAGUES.cfb;

  const matrix = computeRefTeamMatrix(
    stats,
    CFB_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "cfb" },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell">
      <Link href="/cfb" className="back-link">
        ← CFB slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">CFB official × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} officials worked their
          games ({range}). Cells require {matrix.minGames}+ games in this
          dataset. Not predictions; see{" "}
          <Link
            href="/methodology"
            className="font-medium text-zinc-800 hover:underline"
          >
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Simulated seed dataset; W-L derived from stored win rates and may
            round slightly.
          </p>
        )}
        {espn && (
          <p className="mt-2 text-sm text-emerald-800">
            Penalty and scoring stats sourced from ESPN game summaries.
          </p>
        )}
      </section>

      <section className="section-block">
        <div className="data-card overflow-hidden p-0">
          <RefTeamMatrix
            matrix={matrix}
            basePath={league.pathPrefix}
            leagueLabel={league.label}
            officialNounPlural={league.officialNounPlural}
            whistleDiffLabel={matrixWhistleDiffShortLabel(league.metrics)}
            sport="cfb"
          />
        </div>
      </section>

      {extremes.length > 0 && (
        <section className="section-block">
          <h2 className="section-title">Standout official×team splits</h2>
          <p className="section-lead">
            Cells where a team&apos;s win rate with that official diverges sharply
            from their baseline in this sample. Descriptive only, not picks.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {extremes.map((item) => (
              <li key={`${item.refSlug}-${item.teamAbbr}`} className="data-card px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {item.kind === "high" ? "Above baseline" : "Below baseline"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  <Link
                    href={`${league.pathPrefix}/refs/${item.refSlug}#close-game`}
                    className="font-medium text-zinc-900 hover:text-raptors hover:underline"
                  >
                    {item.refName}
                  </Link>{" "}
                  with{" "}
                  <Link
                    href={`${league.pathPrefix}/teams/${item.teamAbbr}`}
                    className="font-medium text-zinc-900 hover:text-raptors hover:underline"
                  >
                    {item.teamLabel}
                  </Link>
                  : ref×team {item.wins}-{item.losses} ({formatPct(item.winRate)}) in{" "}
                  {item.games} games, {formatSigned(item.deltaPts)} vs team sample
                  baseline {item.baselineWins}-{item.baselineLosses} (
                  {formatPct(item.baselineWinRate)} across {item.baselineGames} gp).
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Compare recurring crews or browse official profiles for late-game
          proxies.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link
              href="/cfb/crews"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link
              href="/cfb/refs"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official profiles →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
