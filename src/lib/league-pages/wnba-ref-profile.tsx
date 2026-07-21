import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefereeMasterCard } from "@/components/RefereeMasterCard";
import { ProfileSignalsSection } from "@/components/ProfileSignalsSection";
import { RefProfileJsonLd } from "@/components/RefProfileJsonLd";
import { RefProfileNarrativeLayout } from "@/components/ref-profile/RefProfileNarrativeLayout";
import { TermHelp } from "@/components/TermHelp";
import { resolveRefIntelligenceProfile } from "@/lib/league-pages/ref-profile-intelligence";
import {
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/wnba/data";
import {
  enrichBettingStats,
  refProfileCoreProvenance,
} from "@/lib/provenance";
import { entityNotFoundMetadata, refProfileMetadata } from "@/lib/seo";
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
    return entityNotFoundMetadata("ref", "wnba");
  }
  const stats = getRefStats();
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return refProfileMetadata({
    leagueId: "wnba",
    slug,
    name: profile.name,
    number: profile.number,
    games: profile.games,
    overRateFormatted: formatPct(profile.overRate),
    overBaseline: stats.meta.leagueOverBaseline,
    atsLabel: atsLabel || undefined,
  });
}

export default async function WnbaRefProfilePage({
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
  const profileSignals = computeProfileSignals(profile, stats.meta, "wnba");
  const closeGameMetrics = computeRefCloseGameMetrics(
    profile.slug,
    stats.meta,
    "WNBA",
  );

  const intelligenceProfile = resolveRefIntelligenceProfile({
    leagueId: "wnba",
    profile,
    stats,
    qualified,
  });

  return (
    <div className="page-shell">
      <RefProfileJsonLd
        leagueId="wnba"
        dataLeague="WNBA"
        name={profile.name}
        slug={profile.slug}
        number={profile.number}
        games={profile.games}
        lastUpdated={stats.meta.lastUpdated}
      />
      <Link href="/wnba" className="back-link">
        ← WNBA slate
      </Link>

      <RefereeMasterCard
        profile={profile}
        leagueId="wnba"
        stats={stats}
        sport="wnba"
        qualified={qualified}
        intelligenceFingerprint={intelligenceProfile.fingerprint}
        sampleGateMessage={
          <>
            Below {stats.meta.minSampleSize}-game minimum, metrics hidden until
            sample gate clears.
          </>
        }
      >
        {bbrTeamNote && (
          <p className="mt-3 text-sm text-amber-800">{bbrTeamNote}</p>
        )}
      </RefereeMasterCard>

      <div className="ref-dashboard-grid">
        <div className="ref-dashboard-main">
          <RefProfileNarrativeLayout
            leagueId="wnba"
            profile={profile}
            stats={stats}
            qualified={qualified}
            closeGameMetrics={closeGameMetrics}
            closeGameLeague="WNBA"
            showBettingProfile={Boolean(profile.bettingStats)}
            intelligenceProfile={intelligenceProfile}
          />
        </div>

        <div className="ref-dashboard-sidebar">
          <ProfileSignalsSection
            bundle={profileSignals}
            refName={profile.name}
            lastUpdated={stats.meta.lastUpdated}
            variant="sidebar"
            league="WNBA"
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
              Scoring and foul totals come from WNBA Stats API game logs.
              Ref×team win-loss records are rebuilt from verified game logs.{" "}
            </>
          )}
          Team foul splits live on{" "}
          <Link href="/wnba/teams" className="font-medium text-zinc-800 hover:underline">
            team pages
          </Link>
          . Tonight&apos;s assignment signals are on the{" "}
          <Link href="/wnba" className="font-medium text-zinc-800 hover:underline">
            WNBA slate
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
