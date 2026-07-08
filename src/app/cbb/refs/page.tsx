import type { Metadata } from "next";
import Link from "next/link";
import { RefsDirectory } from "@/components/RefsDirectory";
import { RefsMacroInsight } from "@/components/RefsMacroInsight";
import { formatRefStatsRange, getRefStats } from "@/lib/cbb/data";
import { LEAGUES } from "@/lib/leagues";
import { buildRefsDirectoryContext } from "@/lib/refs-directory";

export const metadata: Metadata = {
  title: "All CBB referees | Ref Watch",
  description:
    "Browse every CBB referee in the Ref Watch dataset with scoring and foul trends.",
};

export default function RefsIndexPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const ctx = buildRefsDirectoryContext(stats, LEAGUES.cbb);

  return (
    <div className="page-shell">
      <Link href="/cbb" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">All referees</h1>
        <p className="page-lead">
          {ctx.meta.qualifiedCount} {LEAGUES.cbb.officialNounPlural} with game
          history across {ctx.meta.seasons.join(", ")} ({range}).
        </p>
        <RefsMacroInsight meta={ctx.meta} league={LEAGUES.cbb} />
      </section>

      <section className="section-block">
        <RefsDirectory
          refs={ctx.refs}
          meta={ctx.meta}
          league={LEAGUES.cbb}
        />
      </section>
    </div>
  );
}
