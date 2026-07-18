import Link from "next/link";
import { GsniResearchTable } from "@/components/GsniResearchTable";
import { TermHelp } from "@/components/TermHelp";
import { GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL } from "@/lib/gsni";
import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
  type GsniResearchHighlight,
} from "@/lib/nfl/gsni-research";
import type { RefStatsFile } from "@/lib/types";

function HighlightCard({ finding }: { finding: GsniResearchHighlight }) {
  return (
    <Link
      href={finding.href}
      className={`rankings-insight-card gsni-research-highlight gsni-research-highlight--${finding.band}`}
    >
      <p className="rankings-insight-kicker">Game-State Index</p>
      <p className="rankings-insight-name">{finding.refName}</p>
      <p className="gsni-research-highlight-score" aria-hidden>
        {finding.gsni}
      </p>
      <p className="rankings-insight-copy">{finding.headline}</p>
      <p className="mt-2 text-xs text-muted">{finding.detail}</p>
    </Link>
  );
}

export function GameStateIndexResearchSection({
  stats,
  basePath = "/nfl",
}: {
  stats: RefStatsFile;
  basePath?: string;
}) {
  const highlights = buildGsniResearchHighlights(stats, basePath);
  const rows = buildGsniResearchRows(stats, basePath);
  if (rows.length === 0) return null;

  return (
    <>
      {highlights.length > 0 ? (
        <section className="section-block">
          <h2 className="section-title">
            <TermHelp id="game-state-index">Game-State Index</TermHelp> highlights
          </h2>
          <p className="section-lead">
            Officials with the strongest clutch-state whistle profiles after clearing the{" "}
            {GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL}+ high-leverage minute gate.
          </p>
          <div className="rankings-insight-grid">
            {highlights.map((finding) => (
              <HighlightCard key={finding.refSlug} finding={finding} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <h2 className="section-title">Official Game-State Index table</h2>
        <p className="section-lead">
          Leverage-weighted flag rate vs league baselines in matched score-and-clock states.
          50 is league-neutral. Higher is quieter in key moments; lower is heavier. Scores
          publish after {GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL}+ high-leverage minutes.{" "}
          <Link href="/research/leverage-spike-anomaly" className="font-medium hover:underline">
            Read the methodology
          </Link>
          .
        </p>
        <GsniResearchTable rows={rows} />
      </section>
    </>
  );
}
