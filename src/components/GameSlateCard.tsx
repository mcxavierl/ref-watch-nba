import Link from "next/link";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
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
import {
  detectTeamsInGame as detectNflTeams,
  refSlug as nflRefSlug,
} from "@/lib/nfl/data";
import {
  detectTeamsInGame as detectCbbTeams,
  refSlug as cbbRefSlug,
} from "@/lib/cbb/data";
import {
  detectTeamsInGame as detectLaligaTeams,
  refSlug as laligaRefSlug,
} from "@/lib/laliga/data";
import {
  detectTeamsInGame as detectEplTeams,
  refSlug as eplRefSlug,
} from "@/lib/epl/data";
import {
  detectTeamsInGame as detectCfbTeams,
  refSlug as cfbRefSlug,
} from "@/lib/cfb/data";
import {
  detectTeamsInGame as detectWnbaTeams,
  teamFullName as wnbaTeamFullName,
  type WnbaTeam,
} from "@/lib/wnba/teams";
import { refSlug as wnbaRefSlug } from "@/lib/wnba/data";
import type { GrudgeStoryline } from "@/lib/grudge-match";
import type {
  CrewHomeBias,
  CrewWhistlePremium,
  NhlOtRateSignal,
  NhlPpPremiumSignal,
} from "@/lib/types";
import { teamFullName as nbaTeamFullName, type NbaTeam } from "@/lib/teams";
import { teamFullName as nhlTeamFullName, type NhlTeam } from "@/lib/nhl/teams";
import { teamFullName as nflTeamFullName, type NflTeam } from "@/lib/nfl/teams";
import { teamFullName as cbbTeamFullName, type CbbTeam } from "@/lib/cbb/teams";
import { teamFullName as cfbTeamFullName, type CfbTeam } from "@/lib/cfb/teams";
import { teamFullName as laligaTeamFullName, type LaligaTeam } from "@/lib/laliga/teams";
import { teamFullName as eplTeamFullName, type EplTeam } from "@/lib/epl/teams";
import {
  benchmarkLabel,
  confidenceTier,
  formatSampleCount,
  sportCopy,
} from "@/lib/user-language";
import { formatSigned } from "@/lib/stats-utils";
import { formatPremiumLabel } from "@/lib/whistle-premium";
import { whistleIndexFromCrewMetrics } from "@/lib/whistle-index";
import { ConfidenceTierBadge } from "@/components/ConfidenceTierBadge";
import { CLINICAL_CARD_CLASS } from "@/components/hub/ClinicalCard";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { OfficialRoleBadge } from "@/components/OfficialRoleBadge";
import { RefAvatar } from "@/components/RefAvatar";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import { signedDeltaTone } from "@/lib/metric-delight";
import { GameGrudgeStorylines } from "./GrudgeMatchSection";
import { NhlSlateSignalBadges } from "./NhlSlateSignalBadges";
import { OuLeanBadge } from "./OuLeanBadge";
import { SampleGateBadge } from "./SampleGateBadge";
import { MetricBlock, MetricGrid } from "./MetricBlock";
import { GamePremiumStrip } from "./WhistlePremiumSection";
import { TeamLogo } from "./TeamLogo";

const SPORT_BENCHMARK = {
  nba: "225",
  wnba: "165",
  cbb: "145",
  nhl: "6.0",
  nfl: "46",
  cfb: "52",
  epl: "2.5",
  laliga: "2.5",
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
  slateIndex = 0,
  onOpenPreview,
}: {
  gameId: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  metrics: CrewMetrics;
  storylines?: GrudgeStoryline[];
  premium: CrewWhistlePremium;
  homeBias?: CrewHomeBias | null;
  sport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";
  basePath?: string;
  ppPremium?: NhlPpPremiumSignal | null;
  otSignal?: NhlOtRateSignal | null;
  overBenchmark?: number;
  slateIndex?: number;
  onOpenPreview?: () => void;
}) {
  const copy = sportCopy(sport);
  const defaultBenchmark = SPORT_BENCHMARK[sport];
  const benchmarkLabelValue =
    overBenchmark !== undefined ? String(overBenchmark) : defaultBenchmark;
  const detectTeams =
    sport === "wnba"
      ? detectWnbaTeams
      : sport === "laliga"
      ? detectLaligaTeams
      : sport === "epl"
      ? detectEplTeams
      : sport === "cfb"
      ? detectCfbTeams
      : sport === "cbb"
        ? detectCbbTeams
        : sport === "nfl"
          ? detectNflTeams
          : sport === "nhl"
            ? detectNhlTeams
            : detectNbaTeams;
  const displayTeamName = (
    team: NbaTeam | NhlTeam | NflTeam | CbbTeam | CfbTeam | EplTeam | LaligaTeam | WnbaTeam,
  ) => {
    if (sport === "wnba") return wnbaTeamFullName(team as WnbaTeam);
    if (sport === "laliga") return laligaTeamFullName(team as LaligaTeam);
    if (sport === "epl") return eplTeamFullName(team as EplTeam);
    if (sport === "cfb") return cfbTeamFullName(team as CfbTeam);
    if (sport === "cbb") return cbbTeamFullName(team as CbbTeam);
    if (sport === "nfl") return nflTeamFullName(team as NflTeam);
    if (sport === "nhl") return nhlTeamFullName(team as NhlTeam);
    return nbaTeamFullName(team as NbaTeam);
  };
  const refSlug =
    sport === "wnba"
      ? wnbaRefSlug
      : sport === "laliga"
      ? laligaRefSlug
      : sport === "epl"
      ? eplRefSlug
      : sport === "cfb"
      ? cfbRefSlug
      : sport === "cbb"
        ? cbbRefSlug
        : sport === "nfl"
          ? nflRefSlug
          : sport === "nhl"
            ? nhlRefSlug
            : nbaRefSlug;
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
  const whistleIndex = whistleIndexFromCrewMetrics(metrics);
  const paceLabel =
    premium.alert === "high_pace"
      ? "High scoring crew"
      : premium.alert === "low_pace"
        ? "Low scoring crew"
        : null;

  const handleCardActivate = () => {
    onOpenPreview?.();
  };

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!onOpenPreview) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button, summary, details, input, select, textarea, label")) return;
    handleCardActivate();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onOpenPreview) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardActivate();
    }
  };

  return (
    <article
      id={`game-${gameId}`}
      className={`data-card ${CLINICAL_CARD_CLASS}${onOpenPreview ? " game-slate-card--interactive" : ""}`}
      data-sport={sport}
      data-crew-pending={metrics.crew.length === 0 ? "true" : undefined}
      style={{ "--slate-i": slateIndex } as CSSProperties}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={onOpenPreview ? 0 : undefined}
      role={onOpenPreview ? "button" : undefined}
      aria-label={onOpenPreview ? `Open ${matchup} ref preview` : undefined}
    >
      <div className="data-card-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {paceLabel && (
              <p className="mb-2">
                <StatusBadge verdict="caution" label={paceLabel} compact />
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
          {metrics.crew.length === 0 && sport === "wnba" ? (
            <span className="crew-chip crew-chip--pending text-sm text-muted">
              Refs not assigned yet
            </span>
          ) : null}
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
              {sport === "nhl" && <OfficialRoleBadge role={official.role} />}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-5 sm:px-5">
        {metrics.crew.length === 0 ? (
          <p className="text-sm text-muted">
            {sport === "wnba"
              ? "Refs not assigned yet. Crew metrics and totals edges publish once official assignments drop."
              : "Crew not assigned yet. Metrics publish once the officiating crew is confirmed."}
          </p>
        ) : metrics.insufficientSample ? (
          <p className="text-sm text-muted">
            Not enough qualified crew history ({metrics.crew.length} official
            {metrics.crew.length === 1 ? "" : "s"}, need 2+ refs at sample
            gate). No crew averages shown.
          </p>
        ) : (
          <>
            {whistleIndex !== null ? (
              <WhistleIndexGauge index={whistleIndex} size="md" className="mb-3" />
            ) : null}
            <div className="game-slate-composite" aria-label="Crew composite tendencies">
              <div className="game-slate-composite-stat">
                <span className="game-slate-composite-label">{copy.scoringLabel}</span>
                <span className="game-slate-composite-value">
                  <StandoutMetricValue tone="neutral" size="lg">
                    {totalDelta}
                  </StandoutMetricValue>
                </span>
                <span className="game-slate-composite-meta tabular-nums">
                  {metrics.avgTotalPoints} avg · {formatPct(metrics.overRate)} over
                </span>
              </div>
              <div className="game-slate-composite-stat">
                <span className="game-slate-composite-label">{copy.whistleLabel}</span>
                <span className="game-slate-composite-value">
                  <StandoutMetricValue tone="neutral" size="lg">
                    {foulsDelta}
                  </StandoutMetricValue>
                </span>
                <span className="game-slate-composite-meta tabular-nums">
                  {metrics.avgFouls} {copy.whistleUnit} avg
                </span>
              </div>
              <div className="game-slate-composite-stat">
                <span className="game-slate-composite-label">vs {bench}</span>
                <span className="game-slate-composite-value">
                  <StandoutMetricValue
                    tone={signedDeltaTone(premium.gapVsBenchmark)}
                    size="lg"
                  >
                    {formatSigned(premium.gapVsBenchmark)}
                  </StandoutMetricValue>
                </span>
                <span className="game-slate-composite-meta tabular-nums">
                  {formatPremiumLabel(premium.scoringPremium)} {copy.pointsAboveAverage.toLowerCase()}
                </span>
              </div>
            </div>
            <p className="game-signal-line game-signal-line--detail">
              <span className="game-signal-label">Crew read:</span>{" "}
              {formatPremiumLabel(premium.scoringPremium)} {copy.pointsAboveAverage.toLowerCase()}{" "}
              ({formatSigned(premium.gapVsBenchmark)} vs {bench}) ·{" "}
              {metrics.avgFouls} {copy.whistleUnit} whistle avg ({foulsDelta} vs league)
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
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-surface-raised sm:px-5 [&::-webkit-details-marker]:hidden">
          View breakdown
          <ChevronDown
            className="size-4 shrink-0 text-zinc-500 transition group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-border-subtle bg-zinc-50/40">
          {metrics.insufficientSample ? (
            <p className="px-4 py-4 text-sm text-muted sm:px-5">
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
