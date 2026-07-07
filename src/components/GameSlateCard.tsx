import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
import { formatSigned } from "@/lib/stats-utils";
import { formatPremiumLabel } from "@/lib/whistle-premium";
import { ConfidenceTierBadge } from "@/components/ConfidenceTierBadge";
import { RefAvatar } from "@/components/RefAvatar";
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

  const totalDelta = formatSigned(metrics.totalPointsDelta);
  const foulsDelta = formatSigned(metrics.foulsDelta);

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
      <div className="data-card-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
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
              <div className="flex flex-wrap items-center gap-2.5">
                {teams.map((team, i) => (
                  <span key={team.abbr} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-sm font-medium text-zinc-400" aria-hidden>
                        @
                      </span>
                    )}
                    <TeamLogo team={team} size="sm" sport={sport} />
                    <span className="game-matchup-abbr">{team.abbr}</span>
                  </span>
                ))}
              </div>
            ) : (
              <h2 className="game-matchup-abbr">{matchup}</h2>
            )}
          </div>
          <div className="shrink-0 self-start">
            <OuLeanBadge lean={metrics.ouLean} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {metrics.crew.map((official, index) => (
            <Link
              key={`${official.name}-${official.number}`}
              href={`${basePath}/refs/${refSlug(official.name, official.number)}`}
              className="crew-chip"
            >
              {index === 0 && <span className="crew-chip-label">Crew</span>}
              <RefAvatar
                name={official.name}
                slug={refSlug(official.name, official.number)}
                sport={sport}
                size="sm"
                className="h-6 w-6 text-[9px]"
              />
              {official.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-5 sm:px-5">
        {metrics.insufficientSample ? (
          <p className="text-sm text-zinc-600">
            Not enough qualified crew history ({metrics.crew.length} official
            {metrics.crew.length === 1 ? "" : "s"}, need 2+ refs at sample
            gate). No crew averages shown.
          </p>
        ) : (
          <>
            <p className="game-signal-line">
              <span className="game-signal-label">{copy.pointsAboveAverage}:</span>{" "}
              <span className="game-signal-value">
                {formatPremiumLabel(premium.scoringPremium)}
              </span>{" "}
              ·{" "}
              <span className="game-signal-value">
                {formatSigned(premium.gapVsBenchmark)}
              </span>{" "}
              vs {bench}
            </p>
            <p className="game-signal-line">
              <span className="game-signal-label">{copy.scoringLabel}:</span>{" "}
              {metrics.avgTotalPoints} avg combined ·{" "}
              <span className="game-signal-value">{totalDelta}</span> vs league ·{" "}
              {formatPct(metrics.overRate)} {copy.overLeanLabel.toLowerCase()}
            </p>
            <p className="game-signal-line">
              <span className="game-signal-label">{copy.whistleLabel}:</span>{" "}
              {metrics.avgFouls} {copy.whistleUnit} avg ·{" "}
              <span className="game-signal-value">{foulsDelta}</span> vs league
            </p>
          </>
        )}
        {homeBias && homeBias.kind !== "neutral" && (
          <p className="game-signal-line">
            <span className="game-signal-label">{copy.homeBiasLabel}:</span>{" "}
            {homeBias.headline}
          </p>
        )}
        {grudgeHeadline && (
          <p className="game-signal-line text-zinc-700">
            <span className="game-signal-label">Ref history flag:</span>{" "}
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
          {metrics.insufficientSample ? (
            <p className="px-4 py-4 text-sm text-zinc-600 sm:px-5">
              Crew metrics require at least two officials above the sample gate.
            </p>
          ) : (
            <>
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
              value={formatSigned(premium.gapVsBenchmark)}
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
            </>
          )}
        </div>
      </details>
    </article>
  );
}
