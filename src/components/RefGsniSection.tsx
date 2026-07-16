import { TermHelp } from "@/components/TermHelp";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "@/components/RefDashboardStatGrid";
import {
  gsniHighLeverageSampleLabel,
  gsniHighLeverageSampleTier,
  type RefGsniMetrics,
} from "@/lib/ref-gsni";
import { GSNI_MIN_HIGH_LEVERAGE_MINUTES } from "@/lib/provenance";
import { formatSampleSizeLabel } from "@/lib/data-maturity";

const TIER_CLASS = {
  high: "sample-confidence-pill sample-confidence-pill--high bg-emerald-500/10 text-emerald-400",
  moderate:
    "sample-confidence-pill sample-confidence-pill--moderate bg-amber-500/10 text-amber-400",
  withheld: "sample-confidence-pill sample-confidence-pill--low bg-rose-500/10 text-rose-400",
} as const;

function GsniSamplePill({ minutes }: { minutes: number }) {
  const tier = gsniHighLeverageSampleTier(minutes);
  const label = gsniHighLeverageSampleLabel(tier);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${TIER_CLASS[tier]}`}
      aria-label={`High-leverage sample: ${label}`}
    >
      {label}
    </span>
  );
}

export function RefGsniSection({
  metrics,
  refName,
  showMetrics = true,
}: {
  metrics: RefGsniMetrics | null;
  refName: string;
  showMetrics?: boolean;
}) {
  if (!metrics) return null;

  const sampleDetail = `${metrics.highLeverageMinutes.toFixed(1)} high-leverage min · ${formatSampleSizeLabel(metrics.sampleGames)}`;

  return (
    <section className="data-card">
      <div className="ref-table-section-header flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-800">
          <TermHelp id="gsni">Game-State Neutralization</TermHelp>
        </h2>
        <GsniSamplePill minutes={metrics.highLeverageMinutes} />
      </div>

      {!showMetrics ? (
        <p className="px-4 py-6 text-sm text-zinc-600">Sample gate not cleared.</p>
      ) : metrics.honestyBanner ? (
        <div className="px-4 py-5 sm:px-5">
          <p className="text-sm leading-relaxed text-zinc-600">{metrics.honestyBanner}</p>
          <p className="mt-2 text-xs text-zinc-500 tabular-nums">{sampleDetail}</p>
          <p className="mt-2 text-xs text-zinc-500">
            50 is league-neutral in matched clutch states. Higher means fewer whistles than
            league peers; lower means more.
          </p>
        </div>
      ) : (
        <div className="px-4 py-4 sm:px-5">
          <p className="mb-4 text-xs leading-relaxed text-zinc-500">
            How {refName} whistles in clutch game states (score gap and clock) vs league
            baselines in the same states. {GSNI_MIN_HIGH_LEVERAGE_MINUTES}+ high-leverage
            minutes required.
          </p>
          <RefDashboardStatGrid>
            <RefDashboardStatCell
              label="GSNI score"
              value={
                metrics.referee_gsni !== undefined
                  ? String(metrics.referee_gsni)
                  : "-"
              }
              detail={metrics.vsNeutralDetail ?? undefined}
              provenance={metrics.provenance}
              sampleSize={metrics.sampleGames}
              source={metrics.source}
              lastUpdated={metrics.lastUpdated}
            />
            {metrics.referee_gsni_volatility !== undefined ? (
              <RefDashboardStatCell
                label="Volatility"
                value={String(metrics.referee_gsni_volatility)}
                detail={metrics.volatilityDetail ?? undefined}
                provenance={metrics.provenance}
                sampleSize={metrics.sampleGames}
                source={metrics.source}
                lastUpdated={metrics.lastUpdated}
              />
            ) : null}
            <RefDashboardStatCell
              label="High-leverage sample"
              value={`${metrics.highLeverageMinutes.toFixed(1)} min`}
              detail={formatSampleSizeLabel(metrics.sampleGames)}
              provenance={metrics.provenance}
              sampleSize={metrics.sampleGames}
              source={metrics.source}
              lastUpdated={metrics.lastUpdated}
            />
          </RefDashboardStatGrid>
        </div>
      )}
    </section>
  );
}
