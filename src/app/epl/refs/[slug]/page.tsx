import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloseGameSection } from "@/components/CloseGameSection";
import { ProfileSignalsSection } from "@/components/ProfileSignalsSection";
import { RefBettingProfile } from "@/components/RefBettingProfile";
import { FavoritesStar } from "@/components/FavoritesStar";
import { RefAvatar } from "@/components/RefAvatar";
import { JsonLd } from "@/components/JsonLd";
import { EplRefAnalyticsSection } from "@/components/EplRefAnalyticsSection";
import { RefProfileMetadataBar } from "@/components/RefProfileMetadataBar";
import { TermHelp } from "@/components/TermHelp";
import { RefStatGrid } from "@/components/RefStatGrid";
import {
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/epl/data";
import {
  enrichBettingStats,
  eplRefAnalyticsProvenance,
  refProfileCoreProvenance,
} from "@/lib/provenance";
import { refProfileDatasetJsonLd } from "@/lib/syndication";
import { entityNotFoundMetadata, refProfileBreadcrumbJsonLd, refProfileMetadata } from "@/lib/seo";
import { userFacingDataNote } from "@/lib/user-language";
import { EplPreviewBanner } from "@/components/EplPreviewBanner";
import { isEplSimulatedData } from "@/lib/epl/data-source";
import { formatRefNameWithNumber } from "@/lib/ref-number";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
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
    return entityNotFoundMetadata("official", "epl");
  }
  const stats = getRefStats();
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return refProfileMetadata({
    leagueId: "epl",
    slug,
    name: profile.name,
    number: profile.number,
    games: profile.games,
    overRateFormatted: formatPct(profile.overRate),
    overBaseline: stats.meta.leagueOverBaseline,
    atsLabel: atsLabel || undefined,
  });
}

export default async function EplRefProfilePage({
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
    eplAnalytics: rawProfile.eplAnalytics
      ? {
          ...rawProfile.eplAnalytics,
          provenance: eplRefAnalyticsProvenance(
            rawProfile,
            rawProfile.eplAnalytics,
            stats.meta,
          ),
        }
      : undefined,
  };
  const qualified = profile.games >= stats.meta.minSampleSize;
  const profileSignals = computeProfileSignals(profile, stats.meta, "epl");
  const closeGameMetrics = computeRefCloseGameMetrics(
    profile.slug,
    stats.meta,
    "EPL",
  );

  return (
    <div className="page-shell">
      <JsonLd
        data={[
          refProfileDatasetJsonLd(
          profile.name,
          profile.slug,
          "EPL",
          profile.games,
          stats.meta.lastUpdated,
        ),
          refProfileBreadcrumbJsonLd(
            "epl",
            profile.name,
            profile.slug,
          ),
        ]}
      />
      <Link
        href="/epl"
        className="back-link"
      >
        ← Home
      </Link>

      <header className="page-profile-header">
        <div className="page-hero-head">
          <RefAvatar
            name={profile.name}
            slug={profile.slug}
            sport="epl"
            size="xl"
            decorative={false}
            className="ring-2 ring-zinc-200 shadow-md"
          />
          <div className="page-hero-head-copy">
            <div className="page-hero-head-title-row">
              <h1 className="page-title">{profile.name}</h1>
              <RefJerseyNumber
                number={profile.number}
                className="font-mono text-sm text-zinc-500"
              />
              <FavoritesStar
                id={profile.slug}
                kind="ref"
                league="epl"
                label={profile.name}
              />
            </div>
          </div>
        </div>
        {!qualified && (
          <p className="mt-3 text-sm text-amber-800">
            Below {stats.meta.minSampleSize}-game minimum, metrics hidden until
            sample gate clears.
          </p>
        )}
        <RefProfileMetadataBar
          seasons={stats.meta.seasons}
          games={profile.games}
          lastUpdated={stats.meta.lastUpdated}
          seeded={isEplSimulatedData(stats.meta.source)}
        />
      </header>

      <EplPreviewBanner statsSource={stats.meta.source} />

      <div className="ref-dashboard-grid">
        <div className="ref-dashboard-main">
          {profile.bettingStats && stats.meta.atsAvailable ? (
            <RefBettingProfile
              profile={profile}
              stats={profile.bettingStats}
              showMetrics={qualified}
            />
          ) : (
            <RefStatGrid
              profile={profile}
              overBaseline={stats.meta.leagueOverBaseline}
              foulLabel="Flags per game"
              scoreLabel="Avg combined goals"
              overLabel={`Games over ${stats.meta.leagueOverBaseline} goals`}
              showMetrics={qualified}
            />
          )}

          {profile.eplAnalytics && (
            <EplRefAnalyticsSection
              analytics={profile.eplAnalytics}
              leagueAvgFouls={stats.meta.leagueAvgFouls}
              leagueAvgYellowCards={stats.meta.leagueAvgYellowCards}
              leagueAvgRedCards={stats.meta.leagueAvgRedCards}
              leagueAvgPenalties={stats.meta.leagueAvgPenalties}
              showMetrics={qualified}
            />
          )}

          <CloseGameSection
            metrics={closeGameMetrics}
            subjectLabel={profile.name}
            league="EPL"
            embedded
          />
        </div>

        <div className="ref-dashboard-sidebar">
          <ProfileSignalsSection
            bundle={profileSignals}
            refName={profile.name}
            lastUpdated={stats.meta.lastUpdated}
            variant="sidebar"
            league="EPL"
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
          <Link href="/epl/teams" className="font-medium text-zinc-800 hover:underline">
            team pages
          </Link>
          . Tonight&apos;s assignment signals are on the{" "}
          <Link href="/epl" className="font-medium text-zinc-800 hover:underline">
            EPL home page
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
