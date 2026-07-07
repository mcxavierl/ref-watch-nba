import type { Metadata } from "next";
import Link from "next/link";
import { RefListItem } from "@/components/RefStatGrid";
import {
  formatRefStatsRange,
  getRefStats,
} from "@/lib/nhl/data";

export const metadata: Metadata = {
  title: "All NHL officials — Ref Watch",
  description:
    "Browse every NHL referee and linesman in the Ref Watch dataset with scoring and PIM trends.",
};

export default function NhlRefsIndexPage() {
  const stats = getRefStats();
  const refs = [...stats.refs].sort((a, b) => a.name.localeCompare(b.name));
  const range = formatRefStatsRange(stats.meta);

  return (
    <div className="page-shell">
      <Link
        href="/nhl"
        className="back-link"
      >
        ← Tonight&apos;s slate
      </Link>

      <header className="mb-8 mt-5">
        <h1 className="page-title">
          All officials
        </h1>
        <p className="page-lead">
          {stats.meta.refCount ?? refs.length} officials with game history across{" "}
          {stats.meta.seasons.join(", ")} ({range}).
        </p>
      </header>

      <div className="data-card divide-y divide-border-subtle">
        {refs.map((profile) => (
          <RefListItem
            key={profile.slug}
            profile={profile}
            basePath="/nhl"
            overBaseline={stats.meta.leagueOverBaseline}
            deltaUnit="goals"
          />
        ))}
      </div>
    </div>
  );
}
