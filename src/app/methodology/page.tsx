import type { Metadata } from "next";
import Link from "next/link";
import { TermHelp } from "@/components/TermHelp";
import { formatRefStatsRange, getRefStats } from "@/lib/data";
import {
  formatRefStatsRange as formatNhlRange,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { buildPageMetadata } from "@/lib/seo";
import { NHL_LINESMAN_METHODOLOGY_NOTE, TRUST_CHARTER_PRINCIPLES } from "@/lib/trust-charter";

export const metadata: Metadata = buildPageMetadata({
  title: "Methodology",
  description:
    "How Ref Watch computes officiating intelligence, ranks research findings, applies sample gates, and labels data confidence. Not betting advice.",
  path: "/methodology",
  keywords: ["referee methodology", "sample gates", "data confidence", "officiating analytics"],
});

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
          How Ref Watch computes referee analytics, ranks findings, and labels
          data confidence. Descriptive historical tendencies, not predictions or
          betting advice.
        </p>
        <ul className="mt-4 max-w-2xl space-y-1.5 text-sm leading-relaxed text-zinc-600">
          {TRUST_CHARTER_PRINCIPLES.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>

      <div className="content-stack">
        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">What we measure</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              Ref profiles and rankings default to officials with{" "}
              {nbaStats.meta.minSampleSize}+ games. Below-gate refs are hidden or
              dimmed; treat as directional only.{" "}
              <TermHelp id="sample-gate" /> badges flag thin samples on slate
              cards and profiles.
            </li>
            <li>
              Team–ref splits need 8+ games per pairing; crew anomalies need 12+.
              ATS and O/U splits need 30+ decisive games with closing lines.
            </li>
            <li>
              <TermHelp id="foul-edge" />: team whistle volume (fouls, flags,
              minors) in games a ref worked (crew-level correlation, not fouls
              charged to that ref alone). W-L splits use the same per-ref game
              sample.
            </li>
            <li>
              <TermHelp id="whistle-premium" />: crew average combined score minus
              league baseline ({nbaStats.meta.leagueAvgTotal} NBA /{" "}
              {nhlStats.meta.leagueAvgTotal} NHL goals). Home/road bias uses win
              and foul splits, not ATS.
            </li>
            <li>
              Tonight&apos;s edges require qualified refs (2+ at{" "}
              {nbaStats.meta.minSampleSize}+ games) before alerting.
            </li>
            <li>{NHL_LINESMAN_METHODOLOGY_NOTE}</li>
          </ul>
        </section>

        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">Data &amp; confidence</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              NBA: {nbaStats.meta.seasons.join(", ")} (
              {formatRefStatsRange(nbaStats.meta)}). NHL:{" "}
              {nhlStats.meta.seasons.join(", ")} ({formatNhlRange(nhlStats.meta)}
              ). League trends from up to ten seasons of game-log aggregates.
            </li>
            <li>
              When <TermHelp id="closing-line">closing lines</TermHelp> are
              unavailable, we use league averages from game logs (
              {nbaStats.meta.leagueOverBaseline} NBA /{" "}
              {nhlStats.meta.leagueOverBaseline} NHL) as over-rate proxies.
            </li>
            <li>
              Some ATS/O/U splits use league-average benchmarks where sportsbook
              data is missing. <TermHelp id="provenance-estimated" /> markers
              flag partial samples only.
            </li>
            <li>
              Historical line data is unavailable for some games; league-average
              benchmarks and provenance markers apply where noted.
            </li>
          </ul>
        </section>

        <section className="panel-inset px-4 py-4 sm:px-5">
          <h2 className="section-title">Findings &amp; limits</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
            <li>
              Findings are scored as effect size × √sample size, weighted by
              sample depth. Category deduplication keeps the hub diverse.
            </li>
            <li>
              Language stays descriptive: &ldquo;historical tendency,&rdquo;
              &ldquo;over rate,&rdquo; &ldquo;foul edge&rdquo;, never picks or
              locks. Browse the full index on the{" "}
              <Link
                href="/insights"
                className="font-medium text-zinc-800 hover:underline"
              >
                insights hub
              </Link>
              .
            </li>
            <li>
              Patterns from past games do not predict future results. Ref Watch is
              independent research, not affiliated with leagues or sportsbooks, and
              not betting advice.
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link href="/insights" className="font-medium text-zinc-800 hover:underline">
          NBA insights →
        </Link>
        <Link href="/nhl/insights" className="font-medium text-zinc-800 hover:underline">
          NHL insights →
        </Link>
        <Link href="/refs" className="font-medium text-zinc-800 hover:underline">
          Refs & crews →
        </Link>
      </div>
    </div>
  );
}
