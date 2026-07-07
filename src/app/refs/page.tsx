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
      <Link href="/" className="back-link">
        ← Tonight&apos;s slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">All referees</h1>
        <p className="page-lead">
          {stats.meta.refCount ?? refs.length} officials with game history across{" "}
          {stats.meta.seasons.join(", ")} ({range}).
        </p>
      </section>

      <section className="section-block">
        <div className="data-card divide-y divide-border-subtle">
          {refs.map((profile) => (
            <RefListItem key={profile.slug} profile={profile} />
          ))}
        </div>
      </section>
    </div>
  );
}
