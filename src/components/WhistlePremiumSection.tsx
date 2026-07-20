import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { ClinicalCard } from "@/components/hub/ClinicalCard";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { TermHelp } from "@/components/TermHelp";
import { ProvenanceMarker } from "@/components/ProvenanceMarker";
import { SampleGateBadge } from "@/components/SampleGateBadge";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { formatSigned } from "@/lib/data";
import { signedDeltaTone } from "@/lib/metric-delight";
import type { CrewHomeBias, CrewWhistlePremium } from "@/lib/types";
import { formatPremiumLabel } from "@/lib/whistle-premium";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */

function PaceAlertCard({ premium }: { premium: CrewWhistlePremium }) {
  const isHigh = premium.alert === "high_pace";
  const paceLabel = isHigh ? "High pace crew alert" : "Low pace crew alert";

  return (
    <ClinicalCard as="article" className="overflow-hidden">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge verdict="caution" label={paceLabel} />
          {premium.sampleQuality !== "strong" && (
            <StatusBadge
              verdict="caution"
              label={`${premium.sampleQuality} sample`}
              compact
            />
          )}
          {premium.provenance && (
            <>
              <ProvenanceMarker provenance={premium.provenance.alert} compact />
              <SampleGateBadge gate={premium.provenance.sampleGate} />
            </>
          )}
        </div>
        <h3 className="mt-2 text-base font-semibold text-zinc-900">
          {premium.matchup}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700">
          Crew adds{" "}
          <StandoutMetricValue
            tone={signedDeltaTone(premium.scoringPremium)}
            size="md"
          >
            {formatPremiumLabel(premium.scoringPremium)}
          </StandoutMetricValue>
          {premium.provenance && (
            <span className="ml-1">
              <ProvenanceMarker provenance={premium.provenance.scoringPremium} compact />
            </span>
          )}{" "}
          on scoring (
          <span className="tabular-nums">{premium.avgTotalPoints}</span> avg) and{" "}
          <StandoutMetricValue
            tone={signedDeltaTone(premium.foulPremium)}
            size="md"
          >
            {formatSigned(premium.foulPremium)}
          </StandoutMetricValue>{" "}
          on fouls vs league. Gap vs{" "}
          {premium.benchmarkSource === "sportsbook"
            ? "sportsbook total"
            : `${premium.benchmarkTotal} league proxy`}
          :{" "}
          <StandoutMetricValue
            tone={signedDeltaTone(premium.gapVsBenchmark)}
            size="md"
          >
            {formatSigned(premium.gapVsBenchmark)}
          </StandoutMetricValue>
          {premium.provenance && (
            <span className="ml-1">
              <ProvenanceMarker provenance={premium.provenance.gapVsBenchmark} compact />
            </span>
          )}
          .
        </p>
        {premium.reunionPremium !== null && premium.reunionGames >= 2 && (
          <p className="mt-2 text-sm text-primary-muted tabular-nums">
            Exact crew reunion: {formatSigned(premium.reunionPremium)} premium
            over {premium.reunionGames} prior games with these teams.
          </p>
        )}
        {premium.alertReason && (
          <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-primary-muted">
            {premium.alertReason}
          </p>
        )}
      </div>
    </ClinicalCard>
  );
}

function HomeBiasCard({
  bias,
  basePath = "",
}: {
  bias: CrewHomeBias;
  basePath?: string;
}) {
  const isHomeProtector = bias.kind === "home_protector";

  return (
    <ClinicalCard as="article" className="px-4 py-3 sm:px-5">
      <StatusBadge
        verdict={isHomeProtector ? "pass" : "caution"}
        label={isHomeProtector ? "Home protector" : "Road warrior"}
      />
      <p className="mt-2 text-sm font-medium text-zinc-900">{bias.headline}</p>
      <p className="mt-1 text-sm leading-relaxed text-primary-muted">
        {bias.summary}
      </p>
      <Link
        href={`${basePath}/teams/${bias.homeAbbr}`}
        className="mt-2 inline-block text-xs font-medium text-zinc-700 hover:underline"
      >
        {bias.homeLabel} crew history →
      </Link>
    </ClinicalCard>
  );
}

export function WhistlePremiumSection({
  paceAlerts,
  homeBiasSignals,
  isPreview = false,
  oddsSource,
  leagueOverBaseline,
  basePath = "",
}: {
  paceAlerts: CrewWhistlePremium[];
  homeBiasSignals: CrewHomeBias[];
  isPreview?: boolean;
  oddsSource: "sportsbook" | "league_proxy" | "mixed";
  leagueOverBaseline?: number;
  basePath?: string;
}) {
  if (paceAlerts.length === 0 && homeBiasSignals.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp className="size-5 text-raptors" aria-hidden />
        <h2 className="text-base font-semibold text-zinc-800">
          Whistle premium alerts
        </h2>
        {isPreview && (
          <StatusBadge verdict="caution" label="Offseason preview" compact />
        )}
      </div>
      <p className="mt-2 text-sm text-primary-muted">
        Crew scoring premium vs league baseline, compared to{" "}
        {oddsSource === "sportsbook"
          ? "sportsbook totals"
          : oddsSource === "mixed"
            ? `sportsbook totals where available, else ${leagueOverBaseline ?? "league"} proxy`
            : `our ${leagueOverBaseline ?? "league"}-point proxy (set ODDS_API_KEY for real lines)`}
        . Alerts require adequate sample size, suppressed when data is thin.
      </p>

      {paceAlerts.length > 0 && (
        <div className="mt-4 space-y-3">
          {paceAlerts.map((premium) => (
            <PaceAlertCard key={premium.gameId} premium={premium} />
          ))}
        </div>
      )}

      {homeBiasSignals.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-800">
            Home / road bias (win-rate proxy, not ATS)
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {homeBiasSignals.map((bias) => (
              <HomeBiasCard key={bias.gameId} bias={bias} basePath={basePath} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function GamePremiumStrip({
  premium,
  homeBias,
  sport = "nba",
}: {
  premium: CrewWhistlePremium;
  homeBias: CrewHomeBias | null;
  sport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";
}) {
  const benchmarkLabel =
    premium.benchmarkSource === "sportsbook"
      ? "book"
      : String(premium.benchmarkTotal);
  const foulLabel =
    sport === "nhl" ? "PIM" : sport === "nfl" || sport === "cfb" ? "flags" : "fouls";
  const premiumTerm =
    sport === "nhl" ? "nhl-whistle-premium" : sport === "nfl" ? "nhl-whistle-premium" : "whistle-premium";
  const premiumLabel =
    sport === "nhl" ? "Goals above average" : "Points above average";

  return (
    <div className="border-t border-border-subtle bg-surface px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-zinc-700">
        <span className="font-medium">
          <TermHelp id={premiumTerm}>{premiumLabel}</TermHelp>
        </span>
        <span className="tabular-nums text-zinc-900">
          <StandoutMetricValue
            tone={signedDeltaTone(premium.scoringPremium)}
            size="md"
          >
            {formatPremiumLabel(premium.scoringPremium)}
          </StandoutMetricValue>
          {" · "}
          <StandoutMetricValue
            tone={signedDeltaTone(premium.foulPremium)}
            size="md"
          >
            {formatSigned(premium.foulPremium)}
          </StandoutMetricValue>{" "}
          {foulLabel}
        </span>
        {premium.provenance && (
          <ProvenanceMarker provenance={premium.provenance.scoringPremium} compact />
        )}
        <span className="text-zinc-400">·</span>
        <span className="tabular-nums">
          <StandoutMetricValue
            tone={signedDeltaTone(premium.gapVsBenchmark)}
            size="md"
          >
            {formatSigned(premium.gapVsBenchmark)}
          </StandoutMetricValue>{" "}
          vs {benchmarkLabel}
        </span>
        {premium.provenance && (
          <ProvenanceMarker provenance={premium.provenance.gapVsBenchmark} compact />
        )}
        {premium.alert && (
          <StatusBadge
            verdict="caution"
            label={
              <TermHelp id="pace-alert">
                {premium.alert === "high_pace" ? "High scoring" : "Low scoring"} signal
              </TermHelp>
            }
            compact
          />
        )}
      </div>
      {homeBias && homeBias.kind !== "neutral" && (
        <p className="mt-2 text-sm text-primary-muted">
          <TermHelp id="home-bias">{homeBias.headline}</TermHelp>
          {homeBias.provenance && (
            <span className="ml-1">
              <ProvenanceMarker provenance={homeBias.provenance.aggregate} compact />
            </span>
          )}
        </p>
      )}
    </div>
  );
}
