import type { Metadata } from "next";
import Link from "next/link";
import { MethodologyPageContent } from "@/components/MethodologyPageContent";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Methodology",
  description:
    "How Ref Watch computes officiating intelligence, applies sample gates, labels confidence tiers, and documents data limits. Descriptive historical analytics, not betting advice.",
  path: "/methodology",
  keywords: [
    "referee methodology",
    "sample gates",
    "data confidence",
    "officiating analytics",
    "ref team matrix",
  ],
});

export default function MethodologyPage() {
  const snapshot = loadOverviewSnapshot();

  return (
    <div className="page-shell clinical-doc-shell">
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <MethodologyPageContent
        snapshot={{
          totalRefs: snapshot.totalRefs,
          totalGames: snapshot.totalGames,
          liveLeagueCount: snapshot.liveLeagueCount,
          whistleEventsLogged: snapshot.whistleEventsLogged,
          whistleLabel: snapshot.whistleLabel,
        }}
      />
    </div>
  );
}
