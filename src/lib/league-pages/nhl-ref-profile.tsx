import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefereeMasterCard } from "@/components/RefereeMasterCard";
import { ProfileSignalsSection } from "@/components/ProfileSignalsSection";
import { RefProfileJsonLd } from "@/components/RefProfileJsonLd";
import { NhlRefAnalyticsSection } from "@/components/NhlRefAnalyticsSection";
import { RefProfileNarrativeLayout } from "@/components/ref-profile/RefProfileNarrativeLayout";
import { TermHelp } from "@/components/TermHelp";
import { resolveRefIntelligenceProfile } from "@/lib/league-pages/ref-profile-intelligence";
import {
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/nhl/data";
import {
  enrichBettingStats,
  nhlRefAnalyticsProvenance,
  refProfileCoreProvenance,
} from "@/lib/provenance";
import { entityNotFoundMetadata, refProfileMetadata } from "@/lib/seo";
import { userFacingDataNote } from "@/lib/user-language";
import { computeRefCloseGameMetrics } from "@/lib/close-game";
import { computeRefGsniMetrics } from "@/lib/ref-gsni";
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
    return entityNotFoundMetadata("official", "nhl");
  }
  const stats = getRefStats();
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return refProfileMetadata({
    leagueId: "nhl",
    slug,
    name: profile.name,
    number: profile.number,
    games: profile.games,
    overRateFormatted: formatPct(profile.overRate),
    overBaseline: stats.meta.leagueOverBaseline,
    atsLabel: atsLabel || undefined,
  });
}

export default async function NhlRefProfilePage({
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
    nhlAnalytics: rawProfile.nhlAnalytics
      ? {
          ...rawProfile.nhlAnalytics,
          provenance: nhlRefAnalyticsProvenance(
            rawProfile,
            rawProfile.nhlAnalytics,
            stats.meta,
          ),
        }
      : undefined,
  };
  const qualified = profile.games >= stats.meta.minSampleSize;
  const profileSignals = computeProfileSignals(profile, stats.meta, "nhl");
  const closeGameMetrics = computeRefCloseGameMetrics(
    profile.slug,
    stats.meta,
    "NHL",
  );
  const gsniMetrics = computeRefGsniMetrics(
    profile.slug,
    stats.meta,
    "NHL",
    profile,
  );

  const intelligenceProfile = resolveRefIntelligenceProfile({
    leagueId: "nhl",
    profile,
    stats,
    qualified,
  });

  return (
    <div className="page-shell">
      <RefProfileJsonLd
        leagueId="nhl"
        dataLeague="NHL"
        name={profile.name}
        slug={profile.slug}
        number={profile.number}
        games={profile.games}
        lastUpdated={stats.meta.lastUpdated}
      />
      <Link
        href="/nhl"
        className="back-link"
      >
        ← Home
      </Link>

      <RefereeMasterCard
        profile={profile}
        leagueId="nhl"
        stats={stats}
        sport="nhl"
        qualified={qualified}
        intelligenceFingerprint={intelligenceProfile.fingerprint}
        sampleGateMessage={
          <>
            Below {stats.meta.minSampleSize}-game minimum, metrics hidden until
            sample gate clears.
          </>
        }
      >
      </RefereeMasterCard>

      <div className="ref-dashboard-grid">
        <div className="ref-dashboard-main">
          <RefProfileNarrativeLayout
            leagueId="nhl"
            profile={profile}
            stats={stats}
            qualified={qualified}
            closeGameMetrics={closeGameMetrics}
            closeGameLeague="NHL"
            gsniMetrics={gsniMetrics}
            showBettingProfile={Boolean(profile.bettingStats)}
            statGridLabels={{
              foulLabel: "PIM per game",
              scoreLabel: "Avg combined goals",
              overLabel: "Games over 6.0 goals",
            }}
            whistleAnalytics={
              profile.nhlAnalytics ? (
                <NhlRefAnalyticsSection
                  analytics={profile.nhlAnalytics}
                  leagueAvgMinors={stats.meta.leagueAvgMinors}
                  leagueOvertimeRate={stats.meta.leagueOvertimeRate}
                  showMetrics={qualified}
                  embedded
                />
              ) : undefined
            }
            intelligenceProfile={intelligenceProfile}
          />
        </div>

        <div className="ref-dashboard-sidebar">
          <ProfileSignalsSection
            bundle={profileSignals}
            refName={profile.name}
            lastUpdated={stats.meta.lastUpdated}
            variant="sidebar"
            league="NHL"
          />
        </div>
      </div>

      <details className="methodology-details panel-inset mt-8 px-5 py-4">
        <summary>How to read this profile</summary>
        <p className="text-sm leading-relaxed text-zinc-600">
          <TermHelp id="ats" /> and <TermHelp id="over-under" /> tables use{" "}
          <TermHelp id="closing-line">closing lines</TermHelp> per game. Where
          sportsbook closing lines are unavailable, ATS/O/U splits use estimated
          lines. Team PIM splits live on{" "}
          <Link href="/nhl/teams" className="font-medium text-zinc-800 hover:underline">
            team pages
          </Link>
          . Tonight&apos;s assignment signals are on the{" "}
          <Link href="/nhl" className="font-medium text-zinc-800 hover:underline">
            NHL home page
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
