import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { PRO_ONLY_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";
import type { LeagueId } from "@/lib/leagues";

export type LiveHighlightTickerItem = {
  id: string;
  leagueId: LeagueId;
  leagueLabel: string;
  copy: string;
  href?: string;
  tone: LeagueInsightCard["heroTone"];
  kind: LeagueInsightCard["kind"];
};

const PRO_LIVE_SET = new Set<LeagueId>(PRO_ONLY_LIVE_LEAGUE_IDS);

function formatTickerCopy(card: LeagueInsightCard): string {
  if (card.kind === "matrix-edge" && card.entityName) {
    return `${card.entityName} ${card.heroValue} vs baseline`;
  }

  if (card.kind === "ref-outlier" && card.entityName) {
    const label = card.heroLabel.toLowerCase();
    return `${card.entityName} - ${card.heroValue} ${label}`;
  }

  const headline = card.entityName ?? card.headline;
  return `${headline} - ${card.heroValue}`;
}

/** Build 5-10 pro-league whistle edge lines for the homepage ticker. */
export function buildLiveHighlightTickerItems(
  cards: LeagueInsightCard[],
  limit = 8,
): LiveHighlightTickerItem[] {
  const seen = new Set<string>();

  return cards
    .filter((card) => PRO_LIVE_SET.has(card.leagueId))
    .filter((card) => card.heroValue && card.heroValue !== "n/a")
    .reduce<LiveHighlightTickerItem[]>((items, card) => {
      if (items.length >= limit) return items;

      const id = [
        card.leagueId,
        card.refSlug ?? "",
        card.teamAbbr ?? "",
        card.headline,
      ].join("|");
      if (seen.has(id)) return items;
      seen.add(id);

      items.push({
        id,
        leagueId: card.leagueId,
        leagueLabel: card.shortLabel,
        copy: formatTickerCopy(card),
        href: card.entityHref ?? card.links[0]?.href,
        tone: card.heroTone,
        kind: card.kind,
      });
      return items;
    }, []);
}
