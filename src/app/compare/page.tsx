import Link from "next/link";
import { Suspense } from "react";
import { RefComparePageClient } from "@/components/RefComparePageClient";
import {
  buildCompareRefPicker,
  loadCompareRefBundle,
  parseCompareRef,
} from "@/lib/ref-compare";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = buildPageMetadata({
  title: "Compare officials",
  description:
    "Side-by-side referee and official tendency compare across NBA, NHL, NFL, EPL, La Liga, and college leagues. Scoring, whistle, and over-rate deltas — descriptive only.",
  path: "/compare",
  keywords: [
    "referee compare",
    "official stats comparison",
    "NBA ref tendencies",
    "NHL official compare",
    "cross-league referee stats",
  ],
});

type PageProps = {
  searchParams: Promise<{ a?: string; b?: string; scope?: string }>;
};

export default async function ComparePage({ searchParams }: PageProps) {
  const { a, b, scope } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const parsedA = parseCompareRef(a);
  const parsedB = parseCompareRef(b);
  const left = parsedA
    ? loadCompareRefBundle(parsedA.leagueId, parsedA.slug, scopeMode)
    : null;
  const right = parsedB
    ? loadCompareRefBundle(parsedB.leagueId, parsedB.slug, scopeMode)
    : null;
  const allRefs = buildCompareRefPicker();

  return (
    <div className="page-shell">
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <header className="page-header">
        <h1 className="page-title">Compare officials</h1>
        <p className="page-lead">
          Pick any two refs or officials to compare scoring, whistle, and
          over-rate tendencies side by side — within a league or across sports.
          Descriptive historical stats only, not picks.
        </p>
      </header>

      <Suspense fallback={null}>
        <RefComparePageClient
          allRefs={allRefs}
          left={left}
          right={right}
          scopeMode={scopeMode}
          siteUrl={SITE_URL}
        />
      </Suspense>
    </div>
  );
}
