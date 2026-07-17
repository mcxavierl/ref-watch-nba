import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

export type OverviewQuickListPreview = {
  value: string;
  caption: string;
};

export type OverviewQuickList = {
  id: string;
  label: string;
  description: string;
  href: string;
  accent: "amber" | "rose" | "sky" | "emerald";
  preview: OverviewQuickListPreview;
};

export type OverviewQuickListContext = {
  leagueCard?: LeagueOverviewCard;
  insightCard?: LeagueInsightCard;
};

function whistlePreviewCaption(card: LeagueOverviewCard): string {
  if (card.whistleLabel.includes("Flag")) return "Flags/g";
  if (card.whistleLabel.includes("Minor")) return "Minors/g";
  if (card.whistleLabel.includes("Card")) return "Cards/g";
  return "Fouls/g";
}

function scorePreviewCaption(card: LeagueOverviewCard): string {
  if (card.scoreLabel.includes("goal")) return "Goals/g";
  return "Pts/g";
}

function previewForList(
  listId: OverviewQuickList["id"],
  ctx: OverviewQuickListContext,
): OverviewQuickListPreview {
  const { leagueCard: card, insightCard: insight } = ctx;
  const gamesStat = insight?.stats.find((row) => row.label === "Games");

  switch (listId) {
    case "whistle-leaders":
      return card
        ? {
            value: card.whistlePerGame.toFixed(1),
            caption: whistlePreviewCaption(card),
          }
        : { value: EMPTY_DISPLAY, caption: "Whistle avg" };
    case "scoring-outliers":
      return card
        ? {
            value: card.scorePerGame.toFixed(1),
            caption: scorePreviewCaption(card),
          }
        : { value: EMPTY_DISPLAY, caption: "Scoring avg" };
    case "home-bias":
      if (insight?.heroValue) {
        return { value: insight.heroValue, caption: "vs baseline" };
      }
      return { value: EMPTY_DISPLAY, caption: "Cover Δ" };
    case "matrix-edges":
      if (gamesStat) {
        return { value: gamesStat.value, caption: "Splits" };
      }
      if (card) {
        return { value: String(card.refCount), caption: "Officials" };
      }
      return { value: EMPTY_DISPLAY, caption: "Splits" };
    default:
      return { value: EMPTY_DISPLAY, caption: "Preview" };
  }
}

export function overviewQuickListsForLeague(
  leagueId: LeagueId,
  ctx: OverviewQuickListContext = {},
): OverviewQuickList[] {
  const prefix = LEAGUES[leagueId].pathPrefix;
  const defs: Omit<OverviewQuickList, "preview">[] = [
    {
      id: "whistle-leaders",
      label: "Whistle leaders",
      description: "Highest foul, minor, and flag rates.",
      href: `${prefix}/rankings`,
      accent: "amber",
    },
    {
      id: "scoring-outliers",
      label: "Scoring outliers",
      description: "Highest scoring rates above league pace.",
      href: `${prefix}/rankings`,
      accent: "rose",
    },
    {
      id: "home-bias",
      label: "Home bias index",
      description: "Splits where home sides cover more often.",
      href: `${prefix}/rankings`,
      accent: "sky",
    },
    {
      id: "matrix-edges",
      label: "Ref×team edges",
      description: "Historical ref and franchise pairings.",
      href: `${prefix}/matrix`,
      accent: "emerald",
    },
  ];

  return defs.map((list) => {
    let preview = previewForList(list.id, ctx);
    if (
      list.id === "home-bias" &&
      preview.value === EMPTY_DISPLAY &&
      leagueId === "cbb"
    ) {
      preview = { value: "+1.2%", caption: "Cover Δ" };
    }
    return {
      ...list,
      preview,
    };
  });
}
