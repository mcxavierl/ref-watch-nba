import { EMPTY_DISPLAY } from "@/lib/finding-copy";
import type { Finding } from "@/lib/findings-shared";
import { insightsViewHref } from "@/lib/insights-routes";
import { leagueHubHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

export type HighlightLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"
>;

/** Converts a dataset Finding into the shared LeagueInsightCard shape for masonry/carousel rendering. */
export function findingToLeagueInsightCard(
  leagueId: HighlightLeagueId,
  finding: Finding,
): LeagueInsightCard {
  const config = LEAGUES[leagueId];
  const primary = finding.stats[0];
  const secondary = finding.stats[1];
  const refLink = finding.links.find((link) => link.href.includes("/refs/"));

  return {
    leagueId,
    label: config.label,
    shortLabel: config.shortLabel,
    kind:
      finding.category === "ref-outlier" || finding.category === "whistle-extreme"
        ? "ref-outlier"
        : "league-pattern",
    kicker:
      finding.category === "ref-team-split"
        ? "Ref×team pattern"
        : finding.category === "whistle-extreme" || finding.category === "ref-outlier"
          ? "Whistle outlier"
          : "League pattern",
    headline: finding.headline,
    story: finding.summary,
    heroValue: primary?.value ?? EMPTY_DISPLAY,
    heroLabel: primary?.label ?? "Lead stat",
    heroTone: "neutral",
    stats: [primary, secondary]
      .filter((stat): stat is { label: string; value: string } => Boolean(stat))
      .map((stat) => ({ label: stat.label, value: stat.value })),
    links: [
      { label: "Full finding", href: insightsViewHref(leagueId, "findings") },
      ...(refLink ? [{ label: refLink.label, href: refLink.href }] : []),
      { label: `${config.shortLabel} hub`, href: leagueHubHref(leagueId) },
    ],
    entityName: refLink?.label,
    entityHref: refLink?.href,
  };
}
