import type { Metadata } from "next";
import Link from "next/link";
import { RefListItem } from "@/components/RefStatGrid";
import {
  formatRefStatsRange,
  getRefStats,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "All NBA referees — Ref Watch",
  description:
    "Browse every NBA referee in the Ref Watch dataset with scoring and foul trends.",
};

export default function RefsIndexPage() {
  const stats = getRefStats();
  const refs = [...stats.refs].sort((a, b) => a.name.localeCompare(b.name));
  const range = formatRefStatsRange(stats.meta);

  return (
    <div className="page-shell">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
      >
        ← Tonight&apos;s slate
      </Link>

      <header className="mb-8 mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
          All referees
        </h1>
        <p className="page-lead">
          {stats.meta.refCount ?? refs.length} officials with game history across{" "}
          {stats.meta.seasons.join(", ")} ({range}).
        </p>
      </header>

      <div className="data-card divide-y divide-border-subtle">
        {refs.map((profile) => (
          <RefListItem key={profile.slug} profile={profile} />
        ))}
      </div>
    </div>
  );
}
