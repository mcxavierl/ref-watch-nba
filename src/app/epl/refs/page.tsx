import type { Metadata } from "next";
import Link from "next/link";
import { RefsDirectory } from "@/components/RefsDirectory";
import { RefsMacroInsight } from "@/components/RefsMacroInsight";
import { formatRefStatsRange, getRefStats } from "@/lib/epl/data";
import { LEAGUES } from "@/lib/leagues";
import { buildRefsDirectoryContext } from "@/lib/refs-directory";

export const metadata: Metadata = {
  title: "All EPL referees | Ref Watch",
  description:
    "Browse every EPL referee in the Ref Watch dataset with scoring and penalty trends.",
};

export default function NhlRefsIndexPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const ctx = buildRefsDirectoryContext(stats, LEAGUES.epl);

  return (
    <div className="page-shell">
      <Link href="/epl" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">All officials</h1>
        <p className="page-lead">
          {ctx.meta.qualifiedCount} {LEAGUES.epl.officialNounPlural} with game
          history across {ctx.meta.seasons.join(", ")} ({range}).
        </p>
        <RefsMacroInsight meta={ctx.meta} league={LEAGUES.epl} />
      </section>

      <section className="section-block">
        <RefsDirectory
          refs={ctx.refs}
          meta={ctx.meta}
          league={LEAGUES.epl}
          basePath="/epl"
        />
      </section>
    </div>
  );
}
