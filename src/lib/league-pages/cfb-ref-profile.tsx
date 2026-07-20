import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefereeMasterCard } from "@/components/RefereeMasterCard";
import { ProfileSignalsSection } from "@/components/ProfileSignalsSection";
import { RefProfileJsonLd } from "@/components/RefProfileJsonLd";
import { CfbRefAnalyticsSection } from "@/components/CfbRefAnalyticsSection";
import { RefProfileMetadataBar } from "@/components/RefProfileMetadataBar";
import { RefProfileNarrativeLayout } from "@/components/ref-profile/RefProfileNarrativeLayout";
import { TermHelp } from "@/components/TermHelp";
import {
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/cfb/data";
import {
  enrichBettingStats,
  cfbRefAnalyticsProvenance,
  refProfileCoreProvenance,
} from "@/lib/provenance";
import { entityNotFoundMetadata, refProfileMetadata } from "@/lib/seo";
import { userFacingDataNote } from "@/lib/user-language";
import { isCfbSimulatedData } from "@/lib/cfb/data-source";
import { computeRefCloseGameMetrics } from "@/lib/close-game";
import { computeProfileSignals } from "@/lib/profile-signals";

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
    return entityNotFoundMetadata("official", "cfb");
  }
  const stats = getRefStats();
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return refProfileMetadata({
    leagueId: "cfb",
    slug,
    name: profile.name,
    number: profile.number,
    games: profile.games,
    overRateFormatted: formatPct(profile.overRate),
    overBaseline: stats.meta.leagueOverBaseline,
    atsLabel: atsLabel || undefined,
  });
}

export default async function CfbRefProfilePage({
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
    cfbAnalytics: rawProfile.cfbAnalytics
      ? {
          ...rawProfile.cfbAnalytics,
          provenance: cfbRefAnalyticsProvenance(
            rawProfile,
            rawProfile.cfbAnalytics,
            stats.meta,
          ),
        }
      : undefined,
  };
  const qualified = profile.games >= stats.meta.minSampleSize;
  const profileSignals = computeProfileSignals(profile, stats.meta, "cfb");
  const closeGameMetrics = computeRefCloseGameMetrics(
    profile.slug,
    stats.meta,
    "CFB",
  );

  return (
    <div className="page-shell">
      <RefProfileJsonLd
        leagueId="cfb"
        dataLeague="CFB"
        name={profile.name}
        slug={profile.slug}
        number={profile.number}
        games={profile.games}
        lastUpdated={stats.meta.lastUpdated}
      />
      <Link
        href="/cfb"
        className="back-link"
      >
        ← Home
      </Link>

      <RefereeMasterCard
        profile={profile}
        leagueId="cfb"
        stats={stats}
        sport="cfb"
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
          seeded={isCfbSimulatedData(stats.meta.source)}
          leagueId="cfb"
          slug={profile.slug}
        />
      </RefereeMasterCard>

      <div className="ref-dashboard-grid">
        <div className="ref-dashboard-main">
          <RefProfileNarrativeLayout
            leagueId="cfb"
            profile={profile}
            stats={stats}
            qualified={qualified}
            closeGameMetrics={closeGameMetrics}
            closeGameLeague="CFB"
            showBettingProfile={Boolean(profile.bettingStats && stats.meta.atsAvailable)}
            statGridLabels={{
              foulLabel: "Flags per game",
              scoreLabel: "Avg combined points",
              overLabel: `Games over ${stats.meta.leagueOverBaseline} pts`,
            }}
            whistleAnalytics={
              profile.cfbAnalytics ? (
                <CfbRefAnalyticsSection
                  analytics={profile.cfbAnalytics}
                  leagueAvgFouls={stats.meta.leagueAvgFouls}
                  leagueAvgPenaltyYards={stats.meta.leagueAvgPenaltyYards}
                  showMetrics={qualified}
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
            league="CFB"
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
          <Link href="/cfb/teams" className="font-medium text-zinc-800 hover:underline">
            team pages
          </Link>
          . Tonight&apos;s assignment signals are on the{" "}
          <Link href="/cfb" className="font-medium text-zinc-800 hover:underline">
            CFB home page
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
