import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniCard } from "@/components/GsniCard";
import { GsniDeltaValue } from "@/components/GsniDeltaValue";
import { GsniResearchTable } from "@/components/GsniResearchTable";
import { GsniSampleCount } from "@/components/GsniSampleCount";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { TermHelp } from "@/components/TermHelp";
import { GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL } from "@/lib/gsni";
import { explainGsni } from "@/lib/gsni-display";
import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
  type GsniResearchHighlight,
} from "@/lib/nfl/gsni-research";
import type { RefStatsFile } from "@/lib/types";

function HighlightCard({ finding }: { finding: GsniResearchHighlight }) {
  const explanation = explainGsni(finding.gsni!);

  return (
    <Link href={finding.href} className="block min-w-0">
      <GsniCard className="gsni-research-highlight gsni-research-highlight--card h-full transition-[border-color,box-shadow] hover:border-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-400" aria-hidden />
          <p className="gsni-gauge-label m-0">Clutch whistle tendency</p>
        </div>
        <p className="mt-2 truncate text-base font-semibold text-white">{finding.refName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <GsniBandBadge band={explanation.band} />
          <GsniDeltaValue delta={explanation.vsLeaguePoints} />
        </div>
        <GsniSharedTrack mode="score" value={finding.gsni!} showValue={false} className="mt-3" />
        <p className="gsni-sub-text mt-2">{explanation.comparisonLine}</p>
        <p className="gsni-sub-text mt-2">
          <GsniSampleCount>{finding.sampleGames}</GsniSampleCount>-game sample ·{" "}
          <GsniSampleCount>{Math.round(finding.highLeverageMinutes)}</GsniSampleCount>{" "}
          HL min
        </p>
      </GsniCard>
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
            <TermHelp id="game-state-index">GSNI highlights</TermHelp>
          </h2>
          <p className="gsni-sub-text section-lead">
            Clutch-state whistle profiles after the{" "}
            {GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL}+ high-leverage minute gate. Quiet means
            fewer flags than league in close, late-clock spots; Heavy means more.
          </p>
          <div className="rankings-insight-grid">
            {highlights.map((finding) => (
              <HighlightCard key={finding.refSlug} finding={finding} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <h2 className="section-title">GSNI official table</h2>
        <p className="gsni-sub-text section-lead">
          Flag rate vs league in matched score-and-clock buckets. Labels: Quiet (below
          league), Heavy (above), Neutral (near 50).{" "}
          <Link href="/research/leverage-spike-anomaly" className="font-medium hover:underline">
            Methodology
          </Link>
          .
        </p>
        <GsniResearchTable rows={rows} />
      </section>
    </>
  );
}
