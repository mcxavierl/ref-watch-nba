import type { Metadata } from "next";
import Link from "next/link";
import { formatPct } from "@/lib/nhl/data";
import { baselineUsingFallback, getBaselinesFile } from "@/lib/baselines";
import { getRefStats } from "@/lib/nhl/data";
import {
  buildYoYNarrative,
  seasonRowsFromBaselines,
} from "@/lib/trends";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL league trends — 5 seasons",
  description:
    "Five-season NHL scoring, minor penalty, and overtime trends from Ref Watch baselines. Year-over-year context in plain language.",
  alternates: { canonical: absoluteUrl("/nhl/trends") },
};

export default function NhlTrendsPage() {
  const baselines = getBaselinesFile();
  const stats = getRefStats();
  const rows = seasonRowsFromBaselines(baselines.NHL.seasons);
  const narrative = buildYoYNarrative(rows, "NHL");
  const usingFallback = baselineUsingFallback("NHL");
  const seeded = stats.meta.source === "seeded";

  return (
    <div className="page-shell">
      <Link href="/nhl" className="back-link">
        ← Tonight&apos;s slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">NHL league trends</h1>
        <p className="page-lead">
          Five-season goal, minor, and overtime baselines from game logs.
          Historical context only — see{" "}
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            methodology
          </Link>
          .
        </p>
        {(usingFallback || seeded) && (
          <p className="mt-2 text-sm text-amber-800">
            {seeded
              ? "Seeded game logs — provenance tags apply."
              : "Using fallback baselines — run compute-baselines when live logs are available."}
          </p>
        )}
      </section>

      {narrative && (
        <section className="section-block-tight">
          <div className="panel-inset px-4 py-4 sm:px-5">
            <h2 className="text-sm font-bold text-zinc-900">{narrative.headline}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {narrative.body}
            </p>
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="data-card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-raised/60 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 sm:px-5">Season</th>
                <th className="px-4 py-3">Games</th>
                <th className="px-4 py-3">Avg goals</th>
                <th className="px-4 py-3">Avg minors</th>
                <th className="px-4 py-3">OT rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row) => (
                <tr key={row.season} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900 sm:px-5">
                    {row.season}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-zinc-700">
                    {row.gameCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                    {row.leagueAvgTotal}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                    {row.leagueAvgMinors !== undefined
                      ? row.leagueAvgMinors
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                    {row.leagueOvertimeRate !== undefined
                      ? formatPct(row.leagueOvertimeRate)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-zinc-600">
          Compare officials:{" "}
          <Link href="/nhl/rankings" className="font-medium text-zinc-800 hover:underline">
            NHL referee rankings →
          </Link>
        </p>
      </section>
    </div>
  );
}
