import { CompareMatchupRefsLink } from "@/components/CompareMatchupRefsLink";
import { PrefetchLink } from "@/components/PrefetchLink";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { ChevronDown } from "lucide-react";
import { detectTeamsInGame as detectNbaTeams } from "@/lib/teams";
import { detectTeamsInGame as detectNhlTeams } from "@/lib/nhl/teams";
import { detectTeamsInGame as detectNflTeams } from "@/lib/nfl/teams";
import { detectTeamsInGame as detectCbbTeams } from "@/lib/cbb/teams";
import { detectTeamsInGame as detectLaligaTeams } from "@/lib/laliga/teams";
import { detectTeamsInGame as detectEplTeams } from "@/lib/epl/teams";
import { detectTeamsInGame as detectCfbTeams } from "@/lib/cfb/teams";
import {
  detectTeamsInGame as detectWnbaTeams,
  teamFullName as wnbaTeamFullName,
  type WnbaTeam,
} from "@/lib/wnba/teams";
import { refSlug } from "@/lib/ref-slug";
import type { GrudgeStoryline } from "@/lib/grudge-match";
import type {
  CrewHomeBias,
  CrewMetrics,
  CrewWhistlePremium,
  NhlOtRateSignal,
  NhlPpPremiumSignal,
} from "@/lib/types";
import type { LeagueId } from "@/lib/leagues";
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
import { formatPct, formatPremiumLabel, formatSigned } from "@/lib/stats-utils";
import { whistleIndexFromCrewMetrics } from "@/lib/whistle-index";
import { ConfidenceTierBadge } from "@/components/ConfidenceTierBadge";
import { CLINICAL_CARD_CLASS } from "@/components/hub/ClinicalCard";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { OfficialRoleBadge } from "@/components/OfficialRoleBadge";
import { RefAvatar } from "@/components/RefAvatar";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import { signedDeltaTone } from "@/lib/metric-delight";
import { semanticImpactTextClass } from "@/lib/semantic-impact";
import { GameGrudgeStorylines } from "./GrudgeMatchSection";
import { EvidenceTeaser } from "@/components/evidence/EvidenceTeaser";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
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
  projectionEvidence,
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
  projectionEvidence?: ProjectionEvidencePayload | null;
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
  const teams = detectTeams(awayTeam, homeTeam);

  const totalDelta = formatSigned(metrics.totalPointsDelta);
  const foulsDelta = formatSigned(metrics.foulsDelta);
  const scoringToneClass = semanticImpactTextClass(metrics.totalPointsDelta, {
    sampleGames: metrics.sampleGames,
  });
  const whistleToneClass = semanticImpactTextClass(metrics.foulsDelta, {
    sampleGames: metrics.sampleGames,
  });

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
                      <span className="game-slate-card-at" aria-hidden>
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {metrics.crew.length === 0 && sport === "wnba" ? (
            <span className="crew-chip crew-chip--pending text-sm text-muted">
              Refs not assigned yet
            </span>
          ) : null}
          {metrics.crew.map((official, index) => (
            <PrefetchLink
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
            </PrefetchLink>
          ))}
          {metrics.crew.length >= 2 ? (
            <CompareMatchupRefsLink
              leagueId={sport as LeagueId}
              officials={metrics.crew}
            />
          ) : null}
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
                <span className={`game-slate-composite-value ${scoringToneClass}`}>
                  <StandoutMetricValue
                    tone={signedDeltaTone(metrics.totalPointsDelta)}
                    size="lg"
                  >
                    {totalDelta}
                  </StandoutMetricValue>
                </span>
                <span className="game-slate-composite-meta tabular-nums">
                  {metrics.avgTotalPoints} avg · {formatPct(metrics.overRate)} over
                </span>
              </div>
              <div className="game-slate-composite-stat">
                <span className="game-slate-composite-label">{copy.whistleLabel}</span>
                <span className={`game-slate-composite-value ${whistleToneClass}`}>
                  <StandoutMetricValue
                    tone={signedDeltaTone(metrics.foulsDelta)}
                    size="lg"
                  >
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
            {projectionEvidence ? (
              <div className="game-slate-evidence-teaser">
                <EvidenceTeaser evidence={projectionEvidence} />
              </div>
            ) : (
              <p className="game-signal-line game-signal-line--detail">
                <span className="game-signal-label">Crew read:</span>{" "}
                {formatPremiumLabel(premium.scoringPremium)} {copy.pointsAboveAverage.toLowerCase()}{" "}
                ({formatSigned(premium.gapVsBenchmark)} vs {bench}) ·{" "}
                {metrics.avgFouls} {copy.whistleUnit} whistle avg ({foulsDelta} vs league)
              </p>
            )}
          </>
        )}
        {!projectionEvidence && homeBias && homeBias.kind !== "neutral" && (
          <p className="game-signal-line">
            <span className="game-signal-label">{copy.homeBiasLabel}:</span>{" "}
            {homeBias.headline}
          </p>
        )}
        {!projectionEvidence && grudgeHeadline && (
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
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-surface-raised sm:px-5 [&::-webkit-details-marker]:hidden">
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
                <PrefetchLink
                  key={team.abbr}
                  href={`${basePath}/teams/${team.abbr}`}
                  className="text-sm font-medium text-zinc-700 hover:text-raptors hover:underline"
                >
                  {displayTeamName(team)} history →
                </PrefetchLink>
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
