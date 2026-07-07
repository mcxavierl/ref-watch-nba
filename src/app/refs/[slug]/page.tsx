import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefBettingProfile } from "@/components/RefBettingProfile";
import { JsonLd } from "@/components/JsonLd";
import { TermHelp } from "@/components/TermHelp";
import { RefStatGrid } from "@/components/RefStatGrid";
import {
  formatDate,
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
import { absoluteUrl } from "@/lib/site";
import { userFacingDataNote } from "@/lib/user-language";

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
    return { title: "Ref not found — Ref Watch NBA" };
  }
  const ats = profile.bettingStats?.homeTeamAts;
  const atsLabel = ats
    ? `${ats.wins}-${ats.losses}${ats.pushes ? `-${ats.pushes}` : ""} home ATS`
    : "";
  return {
    title: `${profile.name} (#${profile.number})`,
    description: `${profile.name}: ${profile.games} games, ${formatPct(profile.overRate)} over 225${atsLabel ? `, ${atsLabel}` : ""}. Sample-gated referee analytics.`,
    alternates: {
      canonical: absoluteUrl(`/refs/${slug}`),
    },
  };
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
  const statsSeeded = stats.meta.source === "seeded";

  return (
    <div className="page-shell">
      <JsonLd
        data={refProfileDatasetJsonLd(
          profile.name,
          profile.slug,
          "NBA",
          profile.games,
          stats.meta.lastUpdated,
        )}
      />
      <Link
        href="/"
        className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
      >
        ← Tonight&apos;s slate
      </Link>

      <header className="mb-8 mt-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            {profile.name}
          </h1>
          <span className="font-mono text-sm text-zinc-500">
            #{profile.number}
          </span>
        </div>
        {!qualified && (
          <p className="mt-3 text-sm text-amber-800">
            Below {stats.meta.minSampleSize}-game minimum — treat metrics as
            directional only.
          </p>
        )}
        <p className="page-meta">
          <span
            className={statsSeeded ? "page-meta-seeded" : "page-meta-live"}
          >
            {statsSeeded ? "Seeded stats" : "Live stats"}
          </span>
          <span>Updated {formatDate(stats.meta.lastUpdated)}</span>
          <span>{stats.meta.seasons.join(", ")}</span>
        </p>
      </header>

      {profile.bettingStats ? (
        <RefBettingProfile profile={profile} stats={profile.bettingStats} />
      ) : (
        <RefStatGrid
          profile={profile}
          overBaseline={stats.meta.leagueOverBaseline}
        />
      )}

      <details className="methodology-details panel-inset mt-8 px-5 py-4">
        <summary>How to read this profile</summary>
        <p className="text-sm leading-relaxed text-zinc-600">
          <TermHelp id="ats" /> and <TermHelp id="over-under" /> tables use{" "}
          <TermHelp id="closing-line">closing lines</TermHelp> per game. Seeded
          data uses synthetic lines. Team foul splits live on{" "}
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
