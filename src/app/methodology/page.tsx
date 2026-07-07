import type { Metadata } from "next";
import Link from "next/link";
import { TermHelp } from "@/components/TermHelp";
import { formatRefStatsRange, getRefStats } from "@/lib/data";
import {
  formatRefStatsRange as formatNhlRange,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { absoluteUrl } from "@/lib/site";
import { seededDataNote } from "@/lib/user-language";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Ref Watch ranks findings, applies sample gates, handles estimated closing lines, and labels provenance. Not betting advice.",
  alternates: { canonical: absoluteUrl("/methodology") },
};

export default function MethodologyPage() {
  const nbaStats = getRefStats();
  const nhlStats = getNhlRefStats();

  return (
    <div className="page-shell">
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">Methodology</h1>
        <p className="page-lead">
          How Ref Watch computes referee analytics, ranks research findings, and
          labels data confidence. Descriptive historical tendencies, not
          predictions or betting advice.
        </p>
      </section>

      <div className="content-stack">
        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">Sample gates</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              Ref profiles and rankings default to officials with{" "}
              {nbaStats.meta.minSampleSize}+ games. Below-gate refs are hidden
              or dimmed; treat as directional only.
            </li>
            <li>
              Team–ref splits require 8+ games per pairing; crew anomalies need
              12+ games.
            </li>
            <li>
              ATS and O/U splits need 30+ decisive games with closing lines
              before surfacing.
            </li>
            <li>
              <TermHelp id="sample-gate" /> badges appear on slate cards and
              profiles when thresholds are not met.
            </li>
          </ul>
        </section>

        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">Research ranking</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              Findings scored as effect size × √sample size, weighted by sample
              depth.
            </li>
            <li>
              Category deduplication keeps the hub diverse, at most one finding
              per category once three picks are chosen.
            </li>
            <li>
              Language is descriptive: &ldquo;historical tendency,&rdquo;
              &ldquo;over rate,&rdquo; &ldquo;foul edge&rdquo;, never picks or
              locks.
            </li>
            <li>
              Browse the full index on the{" "}
              <Link href="/research" className="font-medium text-zinc-800 hover:underline">
                research hub
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">
            Closing lines &amp; provenance
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              When <TermHelp id="closing-line">closing lines</TermHelp> are
              unavailable, we use a fixed league benchmark (
              {nbaStats.meta.leagueOverBaseline} NBA /{" "}
              {nhlStats.meta.leagueOverBaseline} NHL) as an over-rate proxy.
            </li>
            <li>
              Some ATS/O/U splits use estimated closing lines where sportsbook
              data is unavailable, disclosed on every affected finding.
            </li>
            <li>
              <TermHelp id="provenance-estimated" /> markers flag fallback
              constants or partial data.
            </li>
            <li>{seededDataNote()}</li>
          </ul>
        </section>

        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">Slate signals</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              <TermHelp id="whistle-premium" />: crew average combined score
              minus league baseline ({nbaStats.meta.leagueAvgTotal} NBA /{" "}
              {nhlStats.meta.leagueAvgTotal} NHL goals).
            </li>
            <li>
              Home/road bias uses win and foul splits, not ATS.
            </li>
            <li>
              Tonight&apos;s edges require qualified refs (2+ at{" "}
              {nbaStats.meta.minSampleSize}+ games) before alerting.
            </li>
          </ul>
        </section>

        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">Data coverage</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              NBA: {nbaStats.meta.seasons.join(", ")} (
              {formatRefStatsRange(nbaStats.meta)}).
            </li>
            <li>
              NHL: {nhlStats.meta.seasons.join(", ")} (
              {formatNhlRange(nhlStats.meta)}).
            </li>
            <li>
              League trends from{" "}
              <code className="text-xs">data/baselines.json</code>, five
              seasons of game-log aggregates.
            </li>
          </ul>
        </section>

        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">Disclaimer</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Patterns from past games do not predict future results. Ref Watch is
            independent research, not affiliated with the NBA or NHL, and not
            betting advice. For entertainment and analysis only.
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link href="/rankings" className="font-medium text-zinc-800 hover:underline">
          NBA rankings →
        </Link>
        <Link href="/nhl/rankings" className="font-medium text-zinc-800 hover:underline">
          NHL rankings →
        </Link>
        <Link href="/research" className="font-medium text-zinc-800 hover:underline">
          Research hub →
        </Link>
        <Link href="/trends" className="font-medium text-zinc-800 hover:underline">
          NBA trends →
        </Link>
        <Link href="/nhl/trends" className="font-medium text-zinc-800 hover:underline">
          NHL trends →
        </Link>
      </div>
    </div>
  );
}
