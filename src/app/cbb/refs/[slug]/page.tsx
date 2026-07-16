import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloseGameSection } from "@/components/CloseGameSection";
import { ProfileSignalsSection } from "@/components/ProfileSignalsSection";
import { RefBettingProfile } from "@/components/RefBettingProfile";
import { FavoritesStar } from "@/components/FavoritesStar";
import { RefAvatar } from "@/components/RefAvatar";
import { JsonLd } from "@/components/JsonLd";
import { RefProfileMetadataBar } from "@/components/RefProfileMetadataBar";
import { TermHelp } from "@/components/TermHelp";
import { RefStatGrid } from "@/components/RefStatGrid";
import {
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/cbb/data";
import {
  enrichBettingStats,
  refProfileCoreProvenance,
} from "@/lib/provenance";
import { refProfileDatasetJsonLd } from "@/lib/syndication";
import { entityNotFoundMetadata, refProfileBreadcrumbJsonLd, refProfileMetadata } from "@/lib/seo";
import { userFacingDataNote, refTeamDataNote } from "@/lib/user-language";
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
    return entityNotFoundMetadata("ref", "cbb");
  }
  const stats = getRefStats();
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return refProfileMetadata({
    leagueId: "cbb",
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
    "CBB",
  );

  return (
    <div className="page-shell">
      <JsonLd
        data={[
          refProfileDatasetJsonLd(
          profile.name,
          profile.slug,
          "CBB",
          profile.games,
          stats.meta.lastUpdated,
        ),
          refProfileBreadcrumbJsonLd(
            "cbb",
            profile.name,
            profile.slug,
          ),
        ]}
      />
      <Link
        href="/cbb"
        className="back-link"
      >
        ← Home
      </Link>

      <header className="page-profile-header">
        <div className="page-hero-head">
          <RefAvatar
            name={profile.name}
            slug={profile.slug}
            sport="cbb"
            size="lg"
          />
          <div className="page-hero-head-copy">
            <div className="page-hero-head-title-row">
              <h1 className="page-title">{profile.name}</h1>
              <span className="font-tabular text-sm text-muted">
                #{profile.number}
              </span>
              <FavoritesStar
                id={profile.slug}
                kind="ref"
                league="cbb"
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
          seeded={stats.meta.source === "seeded"}
          leagueId="cbb"
          slug={profile.slug}
        />
        {bbrTeamNote && (
          <p className="mt-3 text-sm text-amber-800">{bbrTeamNote}</p>
        )}
      </header>

      <div className="ref-dashboard-grid">
        <div className="ref-dashboard-main">
          {profile.bettingStats ? (
            <RefBettingProfile
              profile={profile}
              stats={profile.bettingStats}
              showMetrics={qualified}
            />
          ) : (
            <RefStatGrid
              profile={profile}
              overBaseline={stats.meta.leagueOverBaseline}
              showMetrics={qualified}
            />
          )}

          <CloseGameSection
            metrics={closeGameMetrics}
            subjectLabel={profile.name}
            league="CBB"
            embedded
          />
        </div>

        <div className="ref-dashboard-sidebar">
          <ProfileSignalsSection
            bundle={profileSignals}
            refName={profile.name}
            lastUpdated={stats.meta.lastUpdated}
            variant="sidebar"
            league="CBB"
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
              Scoring and foul totals come from verified game logs.
              Ref×team win-loss records come from Basketball-Reference.{" "}
            </>
          )}
          Team foul splits live on{" "}
          <Link href="/cbb/teams" className="font-medium text-zinc-800 hover:underline">
            team pages
          </Link>
          . Tonight&apos;s assignment signals are on the{" "}
          <Link href="/cbb" className="font-medium text-zinc-800 hover:underline">
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
