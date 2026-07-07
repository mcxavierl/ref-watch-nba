import Link from "next/link";
import { notFound } from "next/navigation";
import { RefStatGrid } from "@/components/RefStatGrid";
import { OuLeanBadge } from "@/components/OuLeanBadge";
import {
  formatDate,
  formatPct,
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
} from "@/lib/data";
import type { OuLean } from "@/lib/types";

export function generateStaticParams() {
  return getAllRefSlugs().map((slug) => ({ slug }));
}

function refLean(overRate: number, delta: number): OuLean {
  if (overRate >= 0.56 || delta >= 3) return "over";
  if (overRate <= 0.44 || delta <= -3) return "under";
  return "neutral";
}

export default async function RefProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getRefBySlug(slug);
  if (!profile) notFound();

  const stats = getRefStats();
  const lean = refLean(profile.overRate, profile.totalPointsDelta);
  const qualified = profile.games >= stats.meta.minSampleSize;

  return (
    <div className="page-shell">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
      >
        ← Tonight&apos;s slate
      </Link>

      <header className="mb-8 mt-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
            {profile.name}
          </h1>
          <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 font-mono text-xs text-zinc-600">
            #{profile.number}
          </span>
          <OuLeanBadge lean={lean} />
        </div>
        {!qualified && (
          <p className="mt-3 inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800">
            Below {stats.meta.minSampleSize}-game minimum — treat metrics as
            directional only.
          </p>
        )}
        <p className="page-meta">
          <span className="page-meta-live">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Updated {formatDate(stats.meta.lastUpdated)}
          </span>
          <span>{stats.meta.seasons.join(", ")}</span>
          <span>{stats.meta.source}</span>
        </p>
      </header>

      <RefStatGrid profile={profile} />

      <details className="methodology-details panel-inset mt-8 px-5 py-4">
        <summary>How to read this profile</summary>
        <p className="text-sm leading-relaxed text-zinc-600">
          Over rate = {formatPct(profile.overRate)} of this ref&apos;s games
          cleared {stats.meta.leagueOverBaseline} total points. Avg fouls counts
          combined personal fouls from both teams per game — a coarse
          whistle-pace proxy. For team-specific foul splits and home/away crew
          records, see{" "}
          <Link href="/raptors" className="font-medium text-raptors hover:underline">
            Raptors splits
          </Link>{" "}
          or{" "}
          <Link href="/lakers" className="font-medium text-lakers hover:underline">
            Lakers splits
          </Link>
          .
        </p>
        {stats.meta.note && (
          <p className="mt-2 text-xs text-zinc-500">{stats.meta.note}</p>
        )}
      </details>

      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1">
        <Link
          href="/raptors"
          className="text-sm font-medium text-raptors hover:underline"
        >
          Raptors games with this ref →
        </Link>
        <Link
          href="/lakers"
          className="text-sm font-medium text-lakers hover:underline"
        >
          Lakers games with this ref →
        </Link>
      </p>
    </div>
  );
}
