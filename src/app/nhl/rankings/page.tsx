import type { Metadata } from "next";
import Link from "next/link";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import {
  formatRefStatsRange,
  getRefStats,
} from "@/lib/nhl/data";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL referee rankings",
  description:
    "Sortable NHL referee rankings by scoring impact, minor penalties, overtime rate, and over tendency. Sample-gated — descriptive only.",
  alternates: { canonical: absoluteUrl("/nhl/rankings") },
};

export default function NhlRankingsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = stats.meta.source === "seeded";

  return (
    <div className="page-shell">
      <Link
        href="/nhl"
        className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
      >
        ← Tonight&apos;s slate
      </Link>

      <header className="mb-8 mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          NHL referee rankings
        </h1>
        <p className="page-lead">
          Historical goal, minor, and overtime tendencies across{" "}
          {stats.refs.length} officials ({range}). Not predictions — see{" "}
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Seeded dataset — NHL analytics columns show — when unavailable.
          </p>
        )}
      </header>

      <div className="data-card">
        <RefRankingsTable
          refs={stats.refs}
          league="NHL"
          minSampleSize={stats.meta.minSampleSize}
          overBaseline={stats.meta.leagueOverBaseline}
          basePath="/nhl"
        />
      </div>
    </div>
  );
}
