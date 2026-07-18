import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GsniCard } from "@/components/GsniCard";
import { GsniDeltaValue } from "@/components/GsniDeltaValue";
import { GsniResearchTable } from "@/components/GsniResearchTable";
import { GsniSampleCount } from "@/components/GsniSampleCount";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { TermHelp } from "@/components/TermHelp";
import { GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL } from "@/lib/gsni";
import { gsniDeltaFromNeutral } from "@/lib/gsni-ui";
import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
  type GsniResearchHighlight,
} from "@/lib/nfl/gsni-research";
import type { RefStatsFile } from "@/lib/types";

function HighlightCard({ finding }: { finding: GsniResearchHighlight }) {
  const delta = gsniDeltaFromNeutral(finding.gsni!);

  return (
    <Link href={finding.href} className="block min-w-0">
      <GsniCard className="gsni-research-highlight gsni-research-highlight--card h-full transition-[border-color,box-shadow] hover:border-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-400" aria-hidden />
          <p className="gsni-gauge-label m-0">Game-State Index</p>
        </div>
        <p className="mt-2 truncate text-base font-semibold text-white">{finding.refName}</p>
        <GsniSharedTrack mode="score" value={finding.gsni!} className="mt-3" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="m-0 text-sm font-semibold text-slate-200">{finding.headline}</p>
          <GsniDeltaValue delta={delta} />
        </div>
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
            Strongest clutch-state whistle profiles after the{" "}
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
        <h2 className="section-title">GSNI official table</h2>
        <p className="gsni-sub-text section-lead">
          Leverage-weighted flag rate vs league baselines. 50 is neutral.{" "}
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
