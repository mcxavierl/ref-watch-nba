import { Activity, Sparkles, Target, Users } from "lucide-react";
import { TermHelp } from "@/components/TermHelp";
import { GsniCard } from "@/components/GsniCard";
import { GsniInsightPill } from "@/components/GsniInsightPill";
import { GsniRelativeGauge } from "@/components/GsniRelativeGauge";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { GsniSampleCount } from "@/components/GsniSampleCount";
import { GsniSoftLockCard } from "@/components/GsniSoftLockCard";
import {
  gsniConfidenceLabel,
  type RefGsniMetrics,
} from "@/lib/ref-gsni";
import { GSNI_MIN_HIGH_LEVERAGE_MINUTES } from "@/lib/provenance";

export function RefGsniSection({
  metrics,
  showMetrics = true,
}: {
  metrics: RefGsniMetrics | null;
  refName: string;
  showMetrics?: boolean;
}) {
  if (!metrics) return null;

  const gateCleared =
    showMetrics &&
    metrics.gateCleared &&
    metrics.referee_gsni !== undefined;

  return (
    <section className="ref-profile-section">
      <div className="ref-table-section-header flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="flex min-w-0 items-center gap-2 font-semibold leading-snug tracking-tight">
          <Sparkles
            className="h-4 w-4 shrink-0 text-indigo-400"
            strokeWidth={2.1}
            aria-hidden
          />
          <TermHelp id="game-state-index">Game-State Index (GSNI)</TermHelp>
        </h2>
      </div>

      <div className="ref-table-section-body">
        {!showMetrics ? (
          <p className="gsni-sub-text">Sample gate not cleared.</p>
        ) : gateCleared ? (
          <GsniCard>
            <div className="gsni-profile-active">
              {metrics.gsniShrinkageTooltip ? (
                <MetricInfoHint hint={metrics.gsniShrinkageTooltip}>
                  <GsniRelativeGauge gsni={metrics.referee_gsni!} />
                </MetricInfoHint>
              ) : (
                <GsniRelativeGauge gsni={metrics.referee_gsni!} />
              )}
              <div className="gsni-profile-pills">
                <GsniInsightPill icon={Activity}>
                  Confidence: {gsniConfidenceLabel(metrics.highLeverageMinutes)}
                </GsniInsightPill>
                <GsniInsightPill icon={Users}>
                  <GsniSampleCount>
                    {Math.round(metrics.highLeverageMinutes)}
                  </GsniSampleCount>{" "}
                  HL min
                </GsniInsightPill>
                <GsniInsightPill icon={Target}>
                  Benchmark: {GSNI_MIN_HIGH_LEVERAGE_MINUTES} min
                </GsniInsightPill>
              </div>
            </div>
          </GsniCard>
        ) : (
          <GsniSoftLockCard
            minutes={metrics.highLeverageMinutes}
            gate={GSNI_MIN_HIGH_LEVERAGE_MINUTES}
          />
        )}
      </div>
    </section>
  );
}
