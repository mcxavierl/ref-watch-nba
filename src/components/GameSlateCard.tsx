import Link from "next/link";
import { ChevronDown, Users } from "lucide-react";
import type { CrewMetrics } from "@/lib/data";
import {
  detectTeamsInGame as detectNbaTeams,
  formatPct,
  refSlug as nbaRefSlug,
} from "@/lib/data";
import {
  detectTeamsInGame as detectNhlTeams,
  refSlug as nhlRefSlug,
} from "@/lib/nhl/data";
import type { GrudgeStoryline } from "@/lib/grudge-match";
import type {
  CrewHomeBias,
  CrewWhistlePremium,
  NhlOtRateSignal,
  NhlPpPremiumSignal,
} from "@/lib/types";
import { teamFullName as nbaTeamFullName, type NbaTeam } from "@/lib/teams";
import { teamFullName as nhlTeamFullName, type NhlTeam } from "@/lib/nhl/teams";
import {
  benchmarkLabel,
  confidenceTier,
  formatSampleCount,
  sportCopy,
} from "@/lib/user-language";
import { formatPremiumLabel } from "@/lib/whistle-premium";
import { ConfidenceTierBadge } from "@/components/ConfidenceTierBadge";
import { GameGrudgeStorylines } from "./GrudgeMatchSection";
import { NhlSlateSignalBadges } from "./NhlSlateSignalBadges";
import { OuLeanBadge } from "./OuLeanBadge";
import { SampleGateBadge } from "./SampleGateBadge";
import { MetricBlock, MetricGrid } from "./MetricBlock";
import { GamePremiumStrip } from "./WhistlePremiumSection";
import { TeamLogo } from "./TeamLogo";

const SPORT_BENCHMARK = {
  nba: "225",
  nhl: "6.0",
};

export function GameSlateCard({
  gameId,
  matchup,
  awayTeam,
  homeTeam,
  metrics,
  storylines = [],
  premium,
  homeBias = null,
  sport = "nba",
  basePath = "",
  ppPremium = null,
  otSignal = null,
  overBenchmark,
}: {
  gameId: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  metrics: CrewMetrics;
  storylines?: GrudgeStoryline[];
  premium: CrewWhistlePremium;
  homeBias?: CrewHomeBias | null;
  sport?: "nba" | "nhl";
  basePath?: string;
  ppPremium?: NhlPpPremiumSignal | null;
  otSignal?: NhlOtRateSignal | null;
  overBenchmark?: number;
}) {
  const copy = sportCopy(sport);
  const defaultBenchmark = SPORT_BENCHMARK[sport];
  const benchmarkLabelValue =
    overBenchmark !== undefined ? String(overBenchmark) : defaultBenchmark;
  const detectTeams = sport === "nhl" ? detectNhlTeams : detectNbaTeams;
  const displayTeamName = (team: NbaTeam | NhlTeam) =>
    sport === "nhl"
      ? nhlTeamFullName(team as NhlTeam)
      : nbaTeamFullName(team as NbaTeam);
  const refSlug = sport === "nhl" ? nhlRefSlug : nbaRefSlug;
  const teams = detectTeams(awayTeam, homeTeam);

  const totalDelta =
    metrics.totalPointsDelta >= 0
      ? `+${metrics.totalPointsDelta}`
      : String(metrics.totalPointsDelta);
  const foulsDelta =
    metrics.foulsDelta >= 0
      ? `+${metrics.foulsDelta}`
      : String(metrics.foulsDelta);

  const tier = confidenceTier(
    premium.sampleQuality,
    metrics.sampleGames,
    metrics.provenance.sampleGate.cleared,
  );

  const bench = benchmarkLabel(
    premium.benchmarkSource,
    premium.benchmarkTotal ?? benchmarkLabelValue,
  );

  const grudgeHeadline = storylines[0]?.headline;
  const paceLabel =
    premium.alert === "high_pace"
      ? "High scoring crew"
      : premium.alert === "low_pace"
        ? "Low scoring crew"
        : null;

  return (
    <article id={`game-${gameId}`} className="data-card scroll-mt-24">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {paceLabel && (
              <p className="mb-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    premium.alert === "high_pace"
                      ? "border-orange-200 bg-orange-50 text-orange-900"
                      : "border-sky-200 bg-sky-50 text-sky-900"
                  }`}
                >
                  {paceLabel}
                </span>
              </p>
            )}
            {teams.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {teams.map((team, i) => (
                  <span key={team.abbr} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-sm font-medium text-zinc-400" aria-hidden>
                        @
                      </span>
                    )}
                    <TeamLogo team={team} size="sm" sport={sport} />
                    <span className="text-base font-bold tracking-tight text-zinc-900">
                      {team.abbr}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <h2 className="text-base font-bold tracking-tight text-zinc-900">
                {matchup}
              </h2>
            )}
          </div>
          <OuLeanBadge lean={metrics.ouLean} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {metrics.crew.map((official) => (
            <Link
              key={`${official.name}-${official.number}`}
              href={`${basePath}/refs/${refSlug(official.name, official.number)}`}
              className="inline-flex items-center gap-1 rounded border border-border bg-zinc-50 px-2.5 py-1 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              <Users className="size-3 text-zinc-400" aria-hidden />
              {official.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2 px-4 py-4 sm:px-5">
        <p className="text-sm leading-relaxed text-zinc-900">
          <span className="font-bold">{copy.pointsAboveAverage}:</span>{" "}
          <span className="font-bold tabular-nums">
            {formatPremiumLabel(premium.scoringPremium)}
          </span>{" "}
          ·{" "}
          <span className="font-bold tabular-nums">
            {premium.gapVsBenchmark >= 0 ? "+" : ""}
            {premium.gapVsBenchmark}
          </span>{" "}
          vs {bench}
        </p>
        <p className="text-sm leading-relaxed text-zinc-800">
          <span className="font-semibold">{copy.scoringLabel}:</span>{" "}
          {metrics.avgTotalPoints} avg combined ·{" "}
          <span className="font-semibold tabular-nums">{totalDelta}</span> vs
          league · {formatPct(metrics.overRate)} {copy.overLeanLabel.toLowerCase()}
        </p>
        <p className="text-sm leading-relaxed text-zinc-800">
          <span className="font-semibold">{copy.whistleLabel}:</span>{" "}
          {metrics.avgFouls} {copy.whistleUnit} avg ·{" "}
          <span className="font-semibold tabular-nums">{foulsDelta}</span> vs
          league
        </p>
        {homeBias && homeBias.kind !== "neutral" && (
          <p className="text-sm leading-relaxed text-zinc-800">
            <span className="font-semibold">{copy.homeBiasLabel}:</span>{" "}
            {homeBias.headline}
          </p>
        )}
        {grudgeHeadline && (
          <p className="text-sm leading-relaxed text-zinc-700">
            <span className="font-semibold">Ref history flag:</span>{" "}
            {grudgeHeadline}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-4 py-2.5 sm:px-5">
        <span className="text-xs text-zinc-500">
          {formatSampleCount(metrics.sampleGames)} sample
        </span>
        <ConfidenceTierBadge tier={tier} />
        {metrics.insufficientSample && (
          <span className="text-xs text-zinc-500">Below usual sample gate</span>
        )}
      </div>

      <details className="group border-t border-border-subtle">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 sm:px-5 [&::-webkit-details-marker]:hidden">
          View breakdown
          <ChevronDown
            className="size-4 shrink-0 text-zinc-500 transition group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-border-subtle bg-zinc-50/40">
          <div className="px-4 py-2 sm:px-5">
            <SampleGateBadge gate={metrics.provenance.sampleGate} />
          </div>

          <MetricGrid>
            <MetricBlock
              label={copy.scoringLabel}
              value={`${metrics.avgTotalPoints} avg`}
              hint={`${formatPct(metrics.overRate)} historical over rate · ${totalDelta} vs league`}
              badge={`${formatSampleCount(metrics.sampleGames)}`}
              badgeTone="neutral"
              provenance={metrics.provenance.scoring}
            />
            <MetricBlock
              label={copy.whistleLabel}
              value={`${metrics.avgFouls} ${copy.whistleUnit}`}
              hint={`${foulsDelta} vs league avg`}
              badge={
                metrics.insufficientSample
                  ? "Small sample"
                  : formatSampleCount(metrics.sampleGames)
              }
              badgeTone="neutral"
              provenance={metrics.provenance.fouls}
            />
            <MetricBlock
              label={copy.lineComparisonLabel}
              value={`${premium.gapVsBenchmark >= 0 ? "+" : ""}${premium.gapVsBenchmark}`}
              hint={`${premium.avgTotalPoints} avg vs ${bench}`}
              badge={`${formatPremiumLabel(premium.scoringPremium)} above avg`}
              badgeTone="neutral"
              provenance={premium.provenance?.gapVsBenchmark}
            />
          </MetricGrid>

          <GamePremiumStrip premium={premium} homeBias={homeBias} sport={sport} />

          {sport === "nhl" && (
            <NhlSlateSignalBadges ppPremium={ppPremium} otSignal={otSignal} />
          )}

          {teams.length > 0 && (
            <div className="flex flex-wrap gap-3 border-t border-border-subtle px-4 py-3 sm:px-5">
              {teams.map((team) => (
                <Link
                  key={team.abbr}
                  href={`${basePath}/teams/${team.abbr}`}
                  className="text-sm font-medium text-zinc-700 hover:text-raptors hover:underline"
                >
                  {displayTeamName(team)} history →
                </Link>
              ))}
            </div>
          )}

          {storylines.length > 0 && (
            <GameGrudgeStorylines storylines={storylines} />
          )}
        </div>
      </details>
    </article>
  );
}
