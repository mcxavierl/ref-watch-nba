import Link from "next/link";
import { Target, TrendingDown, TrendingUp, Users, Volume2 } from "lucide-react";
import type { CrewMetrics } from "@/lib/data";
import { detectTeamsInGame as detectNbaTeams, formatPct, refSlug as nbaRefSlug } from "@/lib/data";
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
import { scoringDeltaTone } from "@/lib/metricTone";
import { teamFullName as nbaTeamFullName, type NbaTeam } from "@/lib/teams";
import { teamFullName as nhlTeamFullName, type NhlTeam } from "@/lib/nhl/teams";
import { TermHelp } from "@/components/TermHelp";
import { GameGrudgeStorylines } from "./GrudgeMatchSection";
import { NhlSlateSignalBadges } from "./NhlSlateSignalBadges";
import { MetricBlock, MetricGrid } from "./MetricBlock";
import { TeamLogo } from "./TeamLogo";
import { GamePremiumStrip } from "./WhistlePremiumSection";

const SPORT_LABELS = {
  nba: {
    overTerm: "over-225" as const,
    overLabel: "over 225",
    benchmark: "225",
    foulUnit: "fouls",
    whistleHint: "fouls",
  },
  nhl: {
    overTerm: "over-6" as const,
    overLabel: "over 6.0",
    benchmark: "6.0",
    foulUnit: "PIM",
    whistleHint: "PIM",
  },
};

export function GameSlateCard({
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
  const baseLabels = SPORT_LABELS[sport];
  const benchmarkLabel =
    overBenchmark !== undefined ? String(overBenchmark) : baseLabels.benchmark;
  const labels = {
    ...baseLabels,
    overLabel: `over ${benchmarkLabel}`,
    benchmark: benchmarkLabel,
  };
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
  const scoreTone = scoringDeltaTone(metrics.totalPointsDelta);
  const foulTone = scoringDeltaTone(metrics.foulsDelta);

  return (
    <article className="data-card overflow-hidden">
      <div className="border-b border-border bg-gradient-to-r from-zinc-50 to-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {teams.length > 0 ? (
            <div className="flex items-center gap-2">
              {teams.map((team, i) => (
                <span key={team.abbr} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-sm text-zinc-400" aria-hidden>
                      vs
                    </span>
                  )}
                  <TeamLogo team={team} size="sm" sport={sport} />
                  <span className="text-base font-semibold tracking-tight text-zinc-900">
                    {team.abbr}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">
              {matchup}
            </h2>
          )}
        </div>
        {teams.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {teams.map((team) => (
              <Link
                key={team.abbr}
                href={`${basePath}/teams/${team.abbr}`}
                className="text-sm font-medium text-raptors hover:underline"
              >
                {displayTeamName(team)} history →
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border-subtle px-4 py-3 sm:px-5">
        {metrics.crew.map((official) => (
          <Link
            key={`${official.name}-${official.number}`}
            href={`${basePath}/refs/${refSlug(official.name, official.number)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-zinc-50 px-3 py-1 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
          >
            <Users className="size-3.5 text-zinc-400" aria-hidden />
            {official.name}
          </Link>
        ))}
      </div>

      <MetricGrid>
        <MetricBlock
          icon={metrics.totalPointsDelta >= 0 ? TrendingUp : TrendingDown}
          iconClassName={scoreTone === "positive" ? "text-emerald-600" : scoreTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label="Scoring"
          value={`${metrics.avgTotalPoints} avg`}
          hint={
            <>
              {formatPct(metrics.overRate)}{" "}
              <TermHelp id={labels.overTerm}>{labels.overLabel}</TermHelp>
            </>
          }
          badge={`${totalDelta} vs league`}
          badgeTone={scoreTone}
        />
        <MetricBlock
          icon={Volume2}
          iconClassName={foulTone === "positive" ? "text-emerald-600" : foulTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label="Whistle"
          value={`${metrics.avgFouls} ${labels.foulUnit}`}
          hint={`${foulsDelta} vs league avg`}
          badge={metrics.insufficientSample ? "Small sample" : `${metrics.sampleGames}g sample`}
          badgeTone={metrics.insufficientSample ? "warning" : "neutral"}
        />
        <MetricBlock
          icon={Target}
          iconClassName="text-zinc-500"
          label={<TermHelp id="line-gap">Line gap</TermHelp>}
          value={`${premium.gapVsBenchmark >= 0 ? "+" : ""}${premium.gapVsBenchmark}`}
          hint={`${premium.avgTotalPoints} avg vs ${premium.benchmarkSource === "sportsbook" ? "book" : labels.benchmark}`}
          badge={
            <>
              <TermHelp id="whistle-premium">Premium</TermHelp>{" "}
              {premium.scoringPremium >= 0 ? "+" : ""}
              {premium.scoringPremium}
            </>
          }
          badgeTone="neutral"
        />
      </MetricGrid>

      <GamePremiumStrip premium={premium} homeBias={homeBias} sport={sport} />

      {sport === "nhl" && (
        <NhlSlateSignalBadges ppPremium={ppPremium} otSignal={otSignal} />
      )}

      <GameGrudgeStorylines storylines={storylines} />
    </article>
  );
}
