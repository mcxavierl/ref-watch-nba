import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloseGameSection } from "@/components/CloseGameSection";
import { RefereeMasterCard } from "@/components/RefereeMasterCard";
import { ProfileSignalsSection } from "@/components/ProfileSignalsSection";
import { RefBettingProfile } from "@/components/RefBettingProfile";
import { JsonLd } from "@/components/JsonLd";
import { RefGsniSection } from "@/components/RefGsniSection";
import { RefProfileMetadataBar } from "@/components/RefProfileMetadataBar";
import { TermHelp } from "@/components/TermHelp";
import { RefStatGrid } from "@/components/RefStatGrid";
import {
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/data";
import {
  enrichBettingStats,
  refProfileCoreProvenance,
} from "@/lib/provenance";
import { refProfileDatasetJsonLd } from "@/lib/syndication";
import { entityNotFoundMetadata, refProfileBreadcrumbJsonLd, refProfileMetadata } from "@/lib/seo";
import { userFacingDataNote, refTeamDataNote } from "@/lib/user-language";
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
    return entityNotFoundMetadata("ref", "nba");
  }
  const stats = getRefStats();
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return refProfileMetadata({
    leagueId: "nba",
    slug,
    name: profile.name,
    number: profile.number,
    games: profile.games,
    overRateFormatted: formatPct(profile.overRate),
    overBaseline: stats.meta.leagueOverBaseline,
    atsLabel: atsLabel || undefined,
  });
}

export default async function RefProfilePage({
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
  };
  const qualified = profile.games >= stats.meta.minSampleSize;
  const bbrTeamNote = refTeamDataNote(stats.meta);
  const profileSignals = computeProfileSignals(profile, stats.meta, "nba");
  const closeGameMetrics = computeRefCloseGameMetrics(
    profile.slug,
    stats.meta,
    "NBA",
  );
  const gsniMetrics = computeRefGsniMetrics(
    profile.slug,
    stats.meta,
    "NBA",
    profile,
  );

  return (
    <div className="page-shell">
      <JsonLd
        data={[
          refProfileDatasetJsonLd(
          profile.name,
          profile.slug,
          "NBA",
          profile.games,
          stats.meta.lastUpdated,
        ),
          refProfileBreadcrumbJsonLd(
            "nba",
            profile.name,
            profile.slug,
          ),
        ]}
      />
      <Link
        href="/"
        className="back-link"
      >
        ← Home
      </Link>

      <RefereeMasterCard
        profile={profile}
        leagueId="nba"
        stats={stats}
        sport="nba"
        qualified={qualified}
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
          seeded={stats.meta.source === "seeded"}
          leagueId="nba"
          slug={profile.slug}
        />
        {bbrTeamNote && (
          <p className="mt-3 text-sm text-amber-800">{bbrTeamNote}</p>
        )}
      </RefereeMasterCard>

      <div className="ref-dashboard-grid">
        <div className="ref-dashboard-main">
          {profile.bettingStats ? (
            <RefBettingProfile
              profile={profile}
              stats={profile.bettingStats}
              leagueId="nba"
              showMetrics={qualified}
            />
          ) : (
            <RefStatGrid
              profile={profile}
              overBaseline={stats.meta.leagueOverBaseline}
              showMetrics={qualified}
            />
          )}

          <RefGsniSection
            metrics={gsniMetrics}
            refName={profile.name}
            showMetrics={qualified}
          />

          <CloseGameSection
            metrics={closeGameMetrics}
            subjectLabel={profile.name}
            league="NBA"
            embedded
          />
        </div>

        <div className="ref-dashboard-sidebar">
          <ProfileSignalsSection
            bundle={profileSignals}
            refName={profile.name}
            lastUpdated={stats.meta.lastUpdated}
            variant="sidebar"
            league="NBA"
          />
        </div>
      </div>

      <details className="methodology-details panel-inset mt-8 px-5 py-4">
        <summary>How to read this profile</summary>
        <p className="text-sm leading-relaxed text-zinc-600">
          {stats.meta.atsAvailable ? (
            <>
              <TermHelp id="ats" /> and <TermHelp id="over-under" /> tables use{" "}
              <TermHelp id="closing-line">closing lines</TermHelp> per game.
              Where sportsbook closing lines are unavailable, ATS/O/U splits use
              estimated lines.{" "}
            </>
          ) : (
            <>
              Scoring and foul totals come from NBA Stats API game logs.
              Ref×team win-loss records come from Basketball-Reference.{" "}
            </>
          )}
          Team foul splits live on{" "}
          <Link href="/teams" className="font-medium text-zinc-800 hover:underline">
            team pages
          </Link>
          . Tonight&apos;s assignment signals are on the{" "}
          <Link href="/" className="font-medium text-zinc-800 hover:underline">
            home page
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
