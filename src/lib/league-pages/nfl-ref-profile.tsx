import { SiteNavLink as Link } from "@/components/SiteNavLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefereeMasterCard } from "@/components/RefereeMasterCard";
import { ProfileSignalsSection } from "@/components/ProfileSignalsSection";
import { RefProfileJsonLd } from "@/components/RefProfileJsonLd";
import { NflRefAnalyticsSection } from "@/components/NflRefAnalyticsSection";
import { RefProfileMetadataBar } from "@/components/RefProfileMetadataBar";
import { RefProfileNarrativeLayout } from "@/components/ref-profile/RefProfileNarrativeLayout";
import { TermHelp } from "@/components/TermHelp";
import {
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/nfl/data";
import {
  enrichBettingStats,
  nflRefAnalyticsProvenance,
  refProfileCoreProvenance,
} from "@/lib/provenance";
import { entityNotFoundMetadata, refProfileMetadata } from "@/lib/seo";
import { userFacingDataNote } from "@/lib/user-language";
import { isNflSimulatedData } from "@/lib/nfl/data-source";
import { computeRefCloseGameMetrics } from "@/lib/close-game";
import { computeProfileSignals } from "@/lib/profile-signals";
import { computeRefGsniMetrics } from "@/lib/ref-gsni";

export function generateStaticParams() {
  return getAllRefSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = getRefBySlug(slug);
  if (!profile) {
    return entityNotFoundMetadata("official", "nfl");
  }
  const stats = getRefStats();
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return refProfileMetadata({
    leagueId: "nfl",
    slug,
    name: profile.name,
    number: profile.number,
    games: profile.games,
    overRateFormatted: formatPct(profile.overRate),
    overBaseline: stats.meta.leagueOverBaseline,
    atsLabel: atsLabel || undefined,
  });
}

export default async function NflRefProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rawProfile = getRefBySlug(slug);
  if (!rawProfile) notFound();

  const stats = getRefStats();
  const profile = {
    ...rawProfile,
    provenance: refProfileCoreProvenance(rawProfile, stats.meta),
    bettingStats:
      enrichBettingStats(rawProfile, stats.meta) ?? rawProfile.bettingStats,
    nflAnalytics: rawProfile.nflAnalytics
      ? {
          ...rawProfile.nflAnalytics,
          provenance: nflRefAnalyticsProvenance(
            rawProfile,
            rawProfile.nflAnalytics,
            stats.meta,
          ),
        }
      : undefined,
  };
  const qualified = profile.games >= stats.meta.minSampleSize;
  const profileSignals = computeProfileSignals(profile, stats.meta, "nfl");
  const closeGameMetrics = computeRefCloseGameMetrics(
    profile.slug,
    stats.meta,
    "NFL",
  );
  const gsniMetrics = computeRefGsniMetrics(
    profile.slug,
    stats.meta,
    "NFL",
    profile,
  );

  return (
    <div className="page-shell">
      <RefProfileJsonLd
        leagueId="nfl"
        dataLeague="NFL"
        name={profile.name}
        slug={profile.slug}
        number={profile.number}
        games={profile.games}
        lastUpdated={stats.meta.lastUpdated}
      />
      <Link
        href="/nfl"
        className="back-link"
      >
        ← Home
      </Link>

      <RefereeMasterCard
        profile={profile}
        leagueId="nfl"
        stats={stats}
        sport="nfl"
        qualified={qualified}
        avatarSize="xl"
        avatarClassName="ring-2 ring-zinc-200 shadow-md"
        sampleGateMessage={
          <>
            Below {stats.meta.minSampleSize}-game minimum, metrics hidden until
            sample gate clears.
          </>
        }
      >
        <RefProfileMetadataBar
          seasons={profile.seasons}
          games={profile.games}
          lastUpdated={stats.meta.lastUpdated}
          seeded={isNflSimulatedData(stats.meta.source)}
          leagueId="nfl"
          slug={profile.slug}
        />
      </RefereeMasterCard>

      <div className="ref-dashboard-grid">
        <div className="ref-dashboard-main">
          <RefProfileNarrativeLayout
            leagueId="nfl"
            profile={profile}
            stats={stats}
            qualified={qualified}
            gsniMetrics={gsniMetrics}
            closeGameMetrics={closeGameMetrics}
            closeGameLeague="NFL"
            showBettingProfile={Boolean(profile.bettingStats && stats.meta.atsAvailable)}
            statGridLabels={{
              foulLabel: "Flags per game",
              scoreLabel: "Avg combined points",
              overLabel: `Games over ${stats.meta.leagueOverBaseline} pts`,
            }}
            whistleAnalytics={
              profile.nflAnalytics ? (
                <NflRefAnalyticsSection
                  analytics={profile.nflAnalytics}
                  leagueAvgFouls={stats.meta.leagueAvgFouls}
                  leagueAvgPenaltyYards={stats.meta.leagueAvgPenaltyYards}
                  showMetrics={qualified}
                  profile={profile}
                  embedded
                />
              ) : undefined
            }
          />
        </div>

        <div className="ref-dashboard-sidebar">
          <ProfileSignalsSection
            bundle={profileSignals}
            refName={profile.name}
            lastUpdated={stats.meta.lastUpdated}
            variant="sidebar"
            league="NFL"
          />
        </div>
      </div>

      <details className="methodology-details panel-inset mt-8 px-5 py-4">
        <summary>How to read this profile</summary>
        <p className="text-sm leading-relaxed text-zinc-600">
          <TermHelp id="ats" /> and <TermHelp id="over-under" /> tables use{" "}
          <TermHelp id="closing-line">closing lines</TermHelp> per game. Where
          sportsbook closing lines are unavailable, ATS/O/U splits use estimated
          lines. Team penalty splits live on{" "}
          <Link href="/nfl/teams" className="font-medium text-zinc-800 hover:underline">
            team pages
          </Link>
          . Tonight&apos;s assignment signals are on the{" "}
          <Link href="/nfl" className="font-medium text-zinc-800 hover:underline">
            NFL home page
          </Link>
          .
        </p>
        {userFacingDataNote(stats.meta.note) && (
          <p className="mt-2 text-sm text-zinc-500">
            {userFacingDataNote(stats.meta.note)}
          </p>
        )}
      </details>
    </div>
  );
}
