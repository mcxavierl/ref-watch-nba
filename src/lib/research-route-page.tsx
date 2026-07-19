import { notFound, redirect } from "next/navigation";
import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { resolveInsightsLeagueRoute, resolveResearchViewRoute } from "@/lib/research-route-guards";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { computeFindings as computeCbbFindings } from "@/lib/cbb/findings";
import type { InsightsHubView } from "@/lib/insights-hero-content";

type PageProps = {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ scope?: string }>;
};

function metadataTab(
  view: InsightsHubView,
): "rankings" | "research" {
  return view === "findings" || view === "game-state" ? "research" : "rankings";
}

export function createResearchViewPage(defaultTab: InsightsHubView) {
  async function generateMetadata({ params }: PageProps) {
    const { league } = await params;
    const resolved = resolveResearchViewRoute(league, defaultTab);
    if (!resolved) return {};
    return hubPageMetadata(resolved, metadataTab(defaultTab));
  }

  async function Page({ params, searchParams }: PageProps) {
    const { league } = await params;
    const resolved = resolveResearchViewRoute(league, defaultTab);
    if (!resolved) {
      notFound();
    }
    if (
      defaultTab === "findings" &&
      resolved === "cbb" &&
      computeCbbFindings(1, [], { hub: true }).length === 0
    ) {
      redirect(`/${resolved}/research/tendencies`);
    }
    const { scope } = await searchParams;
    return (
      <InsightsHubRoute
        leagueId={resolved}
        defaultTab={defaultTab}
        scopeMode={readSeasonScopeParam(scope)}
      />
    );
  }

  return { generateMetadata, default: Page };
}

export function createTendenciesPage() {
  async function generateMetadata({ params }: PageProps) {
    const { league } = await params;
    const resolved = resolveInsightsLeagueRoute(league);
    if (!resolved) return {};
    return hubPageMetadata(resolved, "rankings");
  }

  async function Page({ params, searchParams }: PageProps) {
    const { league } = await params;
    const resolved = resolveInsightsLeagueRoute(league);
    if (!resolved) notFound();
    const { scope } = await searchParams;
    return (
      <InsightsHubRoute
        leagueId={resolved}
        defaultTab="tendencies"
        scopeMode={readSeasonScopeParam(scope)}
      />
    );
  }

  return { generateMetadata, default: Page };
}
