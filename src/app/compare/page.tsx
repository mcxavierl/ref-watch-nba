import Link from "next/link";
import { Suspense } from "react";
import { ComparePageSkeleton } from "@/components/RefCompareView";
import { RefComparePageClient } from "@/components/RefComparePageClient";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = buildPageMetadata({
  title: "Compare officials",
  description:
    "Side-by-side referee and official tendency compare across NBA, NHL, NFL, EPL, and La Liga. Scoring, whistle, and over-rate deltas, descriptive only.",
  path: "/compare",
  keywords: [
    "referee compare",
    "official stats comparison",
    "NBA ref tendencies",
    "NHL official compare",
    "cross-league referee stats",
  ],
});

/** Static shell — picker and bundles hydrate from CDN JSON on the client (Worker-safe). */
export default function ComparePage() {
  return (
    <div className="page-shell">
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <header className="page-header">
        <h1 className="page-title">Compare officials</h1>
        <p className="page-lead">
          Pick any two refs or officials to compare scoring, whistle, and
          over-rate tendencies side by side, within a league or across sports.
          Descriptive historical stats only, not picks.
        </p>
      </header>

      <Suspense fallback={<ComparePageSkeleton />}>
        <RefComparePageClient siteUrl={SITE_URL} />
      </Suspense>
    </div>
  );
}
