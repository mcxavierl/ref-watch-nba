import type { Metadata } from "next";
import Link from "next/link";
import { CrewDominanceTable } from "@/components/CrewDominanceTable";
import {
  computeCrewDominance,
  crewDominanceSummary,
} from "@/lib/crew-dominance";
import { formatRefStatsRange, getRefStats } from "@/lib/nhl/data";
import { LEAGUES } from "@/lib/leagues";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL crew dynamics",
  description:
    "Recurring NHL officiating crews ranked by combined scoring pace, penalty rate, and dominance vs members' other assignments. Historical splits only.",
  alternates: { canonical: absoluteUrl("/nhl/crews") },
};

export default function NhlCrewsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = stats.meta.source === "seeded";
  const league = LEAGUES.nhl;
  const entries = computeCrewDominance(stats);

  return (
    <div className="page-shell">
      <Link href="/nhl" className="back-link">
        ← NHL slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">NHL crew dynamics</h1>
        <p className="page-lead">
          {crewDominanceSummary(entries, "nhl")} ({range}). Pace and penalty
          deltas compare each crew to league baselines; dominance compares the
          crew to the same officials in other pairings. Not predictions; see{" "}
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
            Historical dataset aggregated from stored team crew splits.
          </p>
        )}
      </section>

      <section className="section-block">
        <div className="data-card">
          <CrewDominanceTable
            entries={entries}
            basePath={league.pathPrefix}
            league="nhl"
            overBaseline={stats.meta.leagueOverBaseline}
            leagueAvgFouls={stats.meta.leagueAvgFouls}
          />
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Cross-tab official×team records or drill into late-game proxies on
          official profiles.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link
              href="/nhl/matrix"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official × team matrix →
            </Link>
          </li>
          <li>
            <Link
              href="/nhl/refs"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official profiles (late-game proxy) →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
