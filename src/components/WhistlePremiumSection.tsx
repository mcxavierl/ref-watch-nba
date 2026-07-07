import Link from "next/link";
import {
  AlertTriangle,
  Flame,
  Home,
  MapPin,
  Snowflake,
  TrendingUp,
} from "lucide-react";
import { formatSigned } from "@/lib/data";
import { TermHelp } from "@/components/TermHelp";
import { homeBiasTone } from "@/lib/home-bias";
import type { CrewHomeBias, CrewWhistlePremium } from "@/lib/types";
import { formatPremiumLabel } from "@/lib/whistle-premium";
import { ProvenanceMarker } from "@/components/ProvenanceMarker";
import { SampleGateBadge } from "@/components/SampleGateBadge";

function PaceAlertCard({ premium }: { premium: CrewWhistlePremium }) {
  const isHigh = premium.alert === "high_pace";
  const Icon = isHigh ? Flame : Snowflake;
  const tone = isHigh
    ? "border-orange-200 bg-orange-50/80"
    : "border-sky-200 bg-sky-50/80";
  const badge = isHigh
    ? "text-orange-900 bg-orange-100 border-orange-200"
    : "text-sky-900 bg-sky-100 border-sky-200";

  return (
    <article className={`overflow-hidden rounded-lg border ${tone}`}>
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge}`}
          >
            <Icon className="size-3.5" aria-hidden />
            {isHigh ? "High pace crew alert" : "Low pace crew alert"}
          </span>
          {premium.sampleQuality !== "strong" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
              <AlertTriangle className="size-3" aria-hidden />
              {premium.sampleQuality} sample
            </span>
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
          <span className="font-mono font-semibold tabular-nums">
            {formatPremiumLabel(premium.scoringPremium)}
          </span>
          {premium.provenance && (
            <span className="ml-1">
              <ProvenanceMarker provenance={premium.provenance.scoringPremium} compact />
            </span>
          )}{" "}
          on scoring ({premium.avgTotalPoints} avg) and{" "}
          <span className="font-mono font-semibold tabular-nums">
            {formatSigned(premium.foulPremium)}
          </span>{" "}
          on fouls vs league. Gap vs{" "}
          {premium.benchmarkSource === "sportsbook"
            ? "sportsbook total"
            : `${premium.benchmarkTotal} league proxy`}
          :{" "}
          <span className="font-mono font-semibold tabular-nums">
            {formatSigned(premium.gapVsBenchmark)}
          </span>
          {premium.provenance && (
            <span className="ml-1">
              <ProvenanceMarker provenance={premium.provenance.gapVsBenchmark} compact />
            </span>
          )}
          .
        </p>
        {premium.reunionPremium !== null && premium.reunionGames >= 2 && (
          <p className="mt-2 text-sm text-zinc-600">
            Exact crew reunion: {formatSigned(premium.reunionPremium)} premium
            over {premium.reunionGames} prior games with these teams.
          </p>
        )}
        {premium.alertReason && (
          <p className="mt-3 border-t border-black/5 pt-3 text-sm leading-relaxed text-zinc-600">
            {premium.alertReason}
          </p>
        )}
      </div>
    </article>
  );
}

function HomeBiasCard({
  bias,
  basePath = "",
}: {
  bias: CrewHomeBias;
  basePath?: string;
}) {
  const Icon = bias.kind === "home_protector" ? Home : MapPin;

  return (
    <article className="rounded-lg border border-border bg-white px-4 py-3 sm:px-5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${homeBiasTone(bias.kind)}`}
      >
        <Icon className="size-3.5" aria-hidden />
        {bias.kind === "home_protector"
          ? "Home protector"
          : "Road warrior"}
      </span>
      <p className="mt-2 text-sm font-medium text-zinc-900">{bias.headline}</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        {bias.summary}
      </p>
      <Link
        href={`${basePath}/teams/${bias.homeAbbr}`}
        className="mt-2 inline-block text-xs font-medium text-zinc-700 hover:underline"
      >
        {bias.homeLabel} crew history →
      </Link>
    </article>
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
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            Offseason preview
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Crew scoring premium vs league baseline, compared to{" "}
        {oddsSource === "sportsbook"
          ? "sportsbook totals"
          : oddsSource === "mixed"
            ? `sportsbook totals where available, else ${leagueOverBaseline ?? "league"} proxy`
            : `our ${leagueOverBaseline ?? "league"}-point proxy (set ODDS_API_KEY for real lines)`}
        . Alerts require adequate sample size — suppressed when data is thin.
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
            Home / road bias (win-rate proxy — not ATS)
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
  sport?: "nba" | "nhl";
}) {
  const benchmarkLabel =
    premium.benchmarkSource === "sportsbook"
      ? "book"
      : String(premium.benchmarkTotal);
  const foulLabel = sport === "nhl" ? "PIM" : "fouls";
  const premiumTerm = sport === "nhl" ? "nhl-whistle-premium" : "whistle-premium";
  const premiumLabel = sport === "nhl" ? "Goals above average" : "Points above average";

  return (
    <div className="border-t border-border-subtle bg-white px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-zinc-700">
        <span className="font-medium">
          <TermHelp id={premiumTerm}>{premiumLabel}</TermHelp>
        </span>
        <span className="font-mono tabular-nums text-zinc-900">
          {formatPremiumLabel(premium.scoringPremium)} ·{" "}
          {formatSigned(premium.foulPremium)} {foulLabel}
        </span>
        {premium.provenance && (
          <ProvenanceMarker provenance={premium.provenance.scoringPremium} compact />
        )}
        <span className="text-zinc-400">·</span>
        <span className="font-mono tabular-nums">
          {formatSigned(premium.gapVsBenchmark)} vs {benchmarkLabel}
        </span>
        {premium.provenance && (
          <ProvenanceMarker provenance={premium.provenance.gapVsBenchmark} compact />
        )}
        {premium.alert && (
          <span className="text-zinc-600">
            ·{" "}
            <TermHelp id="pace-alert">
              {premium.alert === "high_pace" ? "High scoring" : "Low scoring"} signal
            </TermHelp>
          </span>
        )}
      </div>
      {homeBias && homeBias.kind !== "neutral" && (
        <p className="mt-2 text-sm text-zinc-600">
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
