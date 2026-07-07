import Link from "next/link";
import { Target, TrendingDown, TrendingUp, Users, Volume2 } from "lucide-react";
import type { CrewMetrics } from "@/lib/data";
import { detectTeamsInGame, formatPct, refSlug } from "@/lib/data";
import type { GrudgeStoryline } from "@/lib/grudge-match";
import type { CrewHomeBias, CrewWhistlePremium } from "@/lib/types";
import { scoringDeltaTone } from "@/lib/metricTone";
import { teamFullName } from "@/lib/teams";
import { GameGrudgeStorylines } from "./GrudgeMatchSection";
import { MetricBlock, MetricGrid } from "./MetricBlock";
import { TeamLogo } from "./TeamLogo";
import { GamePremiumStrip } from "./WhistlePremiumSection";

export function GameSlateCard({
  matchup,
  awayTeam,
  homeTeam,
  metrics,
  storylines = [],
  premium,
  homeBias = null,
}: {
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  metrics: CrewMetrics;
  storylines?: GrudgeStoryline[];
  premium: CrewWhistlePremium;
  homeBias?: CrewHomeBias | null;
}) {
  const teams = detectTeamsInGame(awayTeam, homeTeam);
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
                  <TeamLogo team={team} size="sm" />
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
                href={`/teams/${team.abbr}`}
                className="text-sm font-medium text-raptors hover:underline"
              >
                {teamFullName(team)} history →
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border-subtle px-4 py-3 sm:px-5">
        {metrics.crew.map((official) => (
          <Link
            key={`${official.name}-${official.number}`}
            href={`/refs/${refSlug(official.name, official.number)}`}
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
          hint={`${formatPct(metrics.overRate)} over 225`}
          badge={`${totalDelta} vs league`}
          badgeTone={scoreTone}
        />
        <MetricBlock
          icon={Volume2}
          iconClassName={foulTone === "positive" ? "text-emerald-600" : foulTone === "negative" ? "text-rose-600" : "text-zinc-500"}
          label="Whistle"
          value={`${metrics.avgFouls} fouls`}
          hint={`${foulsDelta} vs league avg`}
          badge={metrics.insufficientSample ? "Small sample" : `${metrics.sampleGames}g sample`}
          badgeTone={metrics.insufficientSample ? "warning" : "neutral"}
        />
        <MetricBlock
          icon={Target}
          iconClassName="text-zinc-500"
          label="Line gap"
          value={`${premium.gapVsBenchmark >= 0 ? "+" : ""}${premium.gapVsBenchmark}`}
          hint={`${premium.avgTotalPoints} avg vs ${premium.benchmarkSource === "sportsbook" ? "book" : "225"}`}
          badge={`Premium ${premium.scoringPremium >= 0 ? "+" : ""}${premium.scoringPremium}`}
          badgeTone="neutral"
        />
      </MetricGrid>

      <GamePremiumStrip premium={premium} homeBias={homeBias} />

      <GameGrudgeStorylines storylines={storylines} />
    </article>
  );
}
