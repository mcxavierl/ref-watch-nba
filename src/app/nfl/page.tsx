import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { FindingsSection } from "@/components/FindingsSection";
import { GameSlateCard } from "@/components/GameSlateCard";
import { JsonLd } from "@/components/JsonLd";
import { MethodologyAccordion } from "@/components/MethodologyAccordion";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SlateShareBar } from "@/components/SlateShareBar";
import { TermHelp } from "@/components/TermHelp";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/nfl/data";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/nfl/home-bias";
import { getOdds } from "@/lib/nfl/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
} from "@/lib/nfl/whistle-premium";
import { computeFindings } from "@/lib/nfl/findings";
import { resolveSlateGames, computeGameStorylines } from "@/lib/grudge-match";
import type { AssignmentGame } from "@/lib/types";
import {
  buildNflNightlyFeed,
  buildShareText,
  slateDatasetJsonLd,
  slateMetadataDescription,
  slateSportsEvents,
  topShareSignals,
} from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";
import {
  NO_SIGNAL_SLATE_COPY,
  REFWATCH_HERO_SUPPORTING,
  REFWATCH_MISSION,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";
import { NflPreviewBanner } from "@/components/NflPreviewBanner";
import { TonightEdgeSummary } from "@/components/TonightEdgeSummary";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildNflNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  const description = isOffseason
    ? "NFL ref and crew analytics during the offseason, dataset findings, official profiles, and team histories."
    : slateMetadataDescription(feed);
  const title = isOffseason ? "NFL ref data (offseason)" : "Tonight's NFL slate";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/nfl") },
    openGraph: {
      title: `${title} | Ref Watch`,
      description,
      url: absoluteUrl("/nfl"),
      type: "website",
    },
  };
}

function sortSlateGames(
  games: AssignmentGame[],
  refStats: ReturnType<typeof getRefStats>,
) {
  return [...games].sort((a, b) => {
    const aMetrics = computeCrewMetrics(a.crew, refStats);
    const bMetrics = computeCrewMetrics(b.crew, refStats);
    const leanDiff =
      ouLeanSortWeight(bMetrics.ouLean) - ouLeanSortWeight(aMetrics.ouLean);
    if (leanDiff !== 0) return leanDiff;
    return a.matchup.localeCompare(b.matchup);
  });
}

export default function NflHomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const findings = computeFindings();
  const isOffseason = assignments.games.length === 0;
  const { games: slateGames } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const nightlyFeed = buildNflNightlyFeed();

  const edgeItems = buildTonightEdgeSummary({
    sport: "nfl",
    alertPremiums: premiums.filter((p) => p.alert !== null),
    allPremiums: premiums,
    homeBiasSignals,
    ppPremiums: [],
    otSignals: [],
  });

  return (
    <div className="page-shell page-shell-slate">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: isOffseason ? "NFL ref data (offseason)" : "Tonight's NFL slate",
            description: slateMetadataDescription(nightlyFeed),
            url: absoluteUrl("/nfl"),
            dateModified: assignments.lastUpdated,
          },
          slateDatasetJsonLd(nightlyFeed),
          ...slateSportsEvents("NFL"),
        ]}
      />
      <section className="page-hero page-hero-slate">
        <h1 className="page-title">
          {isOffseason ? "NFL officiating intelligence" : REFWATCH_MISSION}
        </h1>
        <p className="page-lead">
          {isOffseason
            ? "Historical crew patterns, official profiles, and team histories while the slate is paused."
            : REFWATCH_HERO_SUPPORTING}
        </p>
        <DataFreshnessMeta assignments={assignments} refStats={refStats} league="NFL" />
      </section>

      <NflPreviewBanner
        statsSource={refStats.meta.source}
        assignmentsSource={assignments.source}
      />

      {isOffseason && <OffseasonSlateNotice league="NFL" />}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="NFL"
        sortExplainer="Ranked by effect size and sample depth. Standout official×team splits and flag outliers rise to the top; marginal league-wide noise is filtered out."
      />

      <section className="slate-quick-links">
        <BrowseActionCards league="NFL" compact />
      </section>

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="NFL"
          />

          <TonightEdgeSummary
            items={edgeItems}
            title={TONIGHT_SIGNALS_TITLE}
            emptyMessage={NO_SIGNAL_SLATE_COPY}
          />

          <section className="section-block">
            <h2 className="section-title">
              {slateGames.length === 1 ? "Tonight's game" : "Tonight's games"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {assignments.source === "espn"
                ? "Crew assignments from ESPN game summaries."
                : "No verified crew assignments published for this date yet."}
            </p>
            <div className="slate-stack mt-4">
              {sortedGames.map((game, index) => (
                <GameSlateCard
                  key={game.id}
                  slateIndex={index}
                  gameId={game.id}
                  matchup={game.matchup}
                  awayTeam={game.awayTeam}
                  homeTeam={game.homeTeam}
                  metrics={computeCrewMetrics(game.crew, refStats)}
                  premium={computeCrewWhistlePremium(game, refStats, odds)}
                  homeBias={computeCrewHomeBias(game, refStats)}
                  sport="nfl"
                  basePath="/nfl"
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary compact />

      <MethodologyAccordion>
        <ul className="space-y-2 text-sm leading-relaxed text-zinc-600">
          <li>
            Findings ranked by effect size × √sample size, with sample gates
            (30+ official games, 8+ team splits).
          </li>
          <li>
            <TermHelp id="nfl-whistle-premium" />: crew avg combined points minus
            league baseline ({refStats.meta.leagueAvgTotal}).
          </li>
          <li>
            Flag and penalty-yard analytics use historical NFL game data with
            estimated closing lines where available.
          </li>
          <li>
            Seasons covered: {refStats.meta.seasons.join(", ")} (
            {refStats.meta.totalGamesProcessed?.toLocaleString() ?? "-"} games).
          </li>
          <li>
            <ProComingSoonTease league="NFL" compact />
          </li>
        </ul>
      </MethodologyAccordion>

      <ProComingSoonTease league="NFL" />
    </div>
  );
}
