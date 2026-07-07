import type { Metadata } from "next";
import Link from "next/link";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import { formatRefStatsRange, getRefStats } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA referee rankings",
  description:
    "Sortable NBA referee rankings by historical scoring impact, whistle rate, and over tendency. Sample-gated — descriptive only.",
  alternates: { canonical: absoluteUrl("/rankings") },
};

export default function NbaRankingsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = stats.meta.source === "seeded";
  const league = LEAGUES.nba;
  const synthesis = buildRankingsSynthesis(stats, league);
  const signalCounts = Object.fromEntries(
    stats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, stats.meta, "nba"),
    ]),
  );

  return (
    <div className="page-shell">
      <Link href="/" className="back-link">
        ← Tonight&apos;s slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">NBA referee rankings</h1>
        <p className="page-lead">
          Historical scoring and whistle tendencies across {stats.refs.length}{" "}
          officials ({range}). Not predictions — see{" "}
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Seeded dataset — metrics use synthetic closing lines where noted.
          </p>
        )}
      </section>

      {synthesis.insights.length > 0 && (
        <section className="section-block">
          <h2 className="section-title">{synthesis.headline}</h2>
          <p className="section-lead">{synthesis.subhead}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {synthesis.insights.map((insight) => (
              <li key={insight.id} className="data-card px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {insight.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  {insight.body}
                </p>
                {insight.refSlug && (
                  <Link
                    href={`/refs/${insight.refSlug}#profile-signals`}
                    className="mt-3 inline-block text-sm font-medium text-zinc-900 hover:text-raptors hover:underline"
                  >
                    {insight.refName} profile signals →
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-zinc-600">{synthesis.leagueSummary}</p>
        </section>
      )}

      <section className="section-block">
        <div className="data-card">
          <RefRankingsTable
            refs={stats.refs}
            league="NBA"
            minSampleSize={stats.meta.minSampleSize}
            overBaseline={stats.meta.leagueOverBaseline}
            signalCounts={signalCounts}
          />
        </div>
      </section>
    </div>
  );
}
