import type { Metadata } from "next";
import Link from "next/link";
import { baselineUsingFallback, getBaselinesFile } from "@/lib/baselines";
import { getRefStats } from "@/lib/data";
import {
  buildYoYNarrative,
  seasonRowsFromBaselines,
} from "@/lib/trends";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA league trends — 5 seasons",
  description:
    "Five-season NBA scoring, foul, and game-count trends from Ref Watch baselines. Year-over-year context in plain language.",
  alternates: { canonical: absoluteUrl("/trends") },
};

export default function NbaTrendsPage() {
  const baselines = getBaselinesFile();
  const stats = getRefStats();
  const rows = seasonRowsFromBaselines(baselines.NBA.seasons);
  const narrative = buildYoYNarrative(rows, "NBA");
  const usingFallback = baselineUsingFallback("NBA");
  const seeded = stats.meta.source === "seeded";

  return (
    <div className="page-shell">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
      >
        ← Tonight&apos;s slate
      </Link>

      <header className="mb-8 mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          NBA league trends
        </h1>
        <p className="page-lead">
          Five-season scoring and whistle baselines from game logs. Historical
          context only — see{" "}
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
      </header>

      {narrative && (
        <div className="panel-inset mb-8 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-bold text-zinc-900">{narrative.headline}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {narrative.body}
          </p>
        </div>
      )}

      <div className="data-card overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-raised/60 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 sm:px-5">Season</th>
              <th className="px-4 py-3">Games</th>
              <th className="px-4 py-3">Avg total pts</th>
              <th className="px-4 py-3">Avg fouls</th>
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
                  {row.leagueAvgFouls}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-zinc-600">
        Compare officials:{" "}
        <Link href="/rankings" className="font-medium text-zinc-800 hover:underline">
          NBA referee rankings →
        </Link>
      </p>
    </div>
  );
}
