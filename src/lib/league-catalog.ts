import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { LeagueId } from "@/lib/leagues";
import { LEAGUES } from "@/lib/leagues";
import { formatLeagueSeasonStart } from "@/config/leagueConfig";
import { NCAA_INTEGRITY_AUDIT_HREF } from "@/lib/ncaa-audit-status";
import { isCatalogSlugVisible, isDashboardLeagueExposed, isLeagueAnalyticsUnlocked } from "@/config/leagues";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";

export type CatalogLeagueStatus = "live" | "coming-soon" | "audit-pending";

export type CatalogSportGroup =
  | "basketball"
  | "hockey"
  | "football"
  | "soccer"
  | "college"
  | "baseball";

export type CatalogLeagueEntry = {
  id: string;
  label: string;
  region: string;
  sport: CatalogSportGroup;
  status: CatalogLeagueStatus;
  /** Live leagues map to Ref Watch routes. */
  leagueId?: LeagueId;
  href?: string;
  /** Rough ordering within sidebar groups. */
  sort: number;
};

/** Live leagues are driven by verification; never duplicate routing here. */
export const LIVE_CATALOG_LEAGUE_IDS = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
] as const satisfies readonly LeagueId[];

/** Short season-start labels for overview hub badges (MM/DD). */
export function leagueSeasonStartBadge(leagueId: LeagueId): string | undefined {
  return formatLeagueSeasonStart(leagueId);
}

export function catalogStatusLabel(entry: CatalogLeagueEntry): string {
  if (entry.status === "audit-pending") return "Audit";
  if (entry.status === "live" && entry.leagueId) {
    return leagueSeasonStartBadge(entry.leagueId) ?? "—";
  }
  return "Soon";
}

/**
 * Expanded competition catalog for the overview hub.
 * Coming-soon entries are roadmap only: no routes, no header switcher, no data loaders.
 */
export const LEAGUE_CATALOG: CatalogLeagueEntry[] = [
  { id: "nba", label: "NBA", region: "USA", sport: "basketball", status: "live", leagueId: "nba", href: "/nba", sort: 1 },
  { id: "wnba", label: "WNBA", region: "USA", sport: "basketball", status: "coming-soon", sort: 2 },
  { id: "nhl", label: "NHL", region: "North America", sport: "hockey", status: "live", leagueId: "nhl", href: "/nhl", sort: 10 },
  { id: "nfl", label: "NFL", region: "USA", sport: "football", status: "live", leagueId: "nfl", href: "/nfl", sort: 20 },
  { id: "epl", label: "Premier League", region: "England", sport: "soccer", status: "live", leagueId: "epl", href: "/epl", sort: 30 },
  { id: "la-liga", label: "La Liga", region: "Spain", sport: "soccer", status: "live", leagueId: "laliga", href: "/laliga", sort: 31 },
  { id: "serie-a", label: "Serie A", region: "Italy", sport: "soccer", status: "coming-soon", sort: 32 },
  { id: "bundesliga", label: "Bundesliga", region: "Germany", sport: "soccer", status: "coming-soon", sort: 33 },
  { id: "ligue-1", label: "Ligue 1", region: "France", sport: "soccer", status: "coming-soon", sort: 34 },
  { id: "championship", label: "Championship", region: "England", sport: "soccer", status: "coming-soon", sort: 35 },
  { id: "mls", label: "MLS", region: "USA", sport: "soccer", status: "coming-soon", sort: 36 },
  { id: "eredivisie", label: "Eredivisie", region: "Netherlands", sport: "soccer", status: "coming-soon", sort: 37 },
  { id: "primeira-liga", label: "Primeira Liga", region: "Portugal", sport: "soccer", status: "coming-soon", sort: 38 },
  { id: "liga-mx", label: "Liga MX", region: "Mexico", sport: "soccer", status: "coming-soon", sort: 39 },
  { id: "ucl", label: "UEFA Champions League", region: "Europe", sport: "soccer", status: "coming-soon", sort: 40 },
  { id: "uel", label: "UEFA Europa League", region: "Europe", sport: "soccer", status: "coming-soon", sort: 41 },
  { id: "libertadores", label: "CONMEBOL Libertadores", region: "South America", sport: "soccer", status: "coming-soon", sort: 42 },
  { id: "cbb", label: "NCAA Basketball", region: "USA", sport: "college", status: "audit-pending", leagueId: "cbb", href: `${NCAA_INTEGRITY_AUDIT_HREF}#cbb`, sort: 50 },
  { id: "cfb", label: "NCAA Football", region: "USA", sport: "college", status: "audit-pending", leagueId: "cfb", href: `${NCAA_INTEGRITY_AUDIT_HREF}#cfb`, sort: 51 },
  { id: "mlb", label: "MLB", region: "USA", sport: "baseball", status: "coming-soon", sort: 52 },
];

export const CATALOG_SPORT_LABELS: Record<CatalogSportGroup, string> = {
  basketball: "Basketball",
  hockey: "Hockey",
  football: "American football",
  soccer: "Football",
  college: "College",
  baseball: "Baseball",
};

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
      description: "Crews furthest above league scoring pace.",
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

  return defs.map((list) => ({
    ...list,
    preview: previewForList(list.id, ctx),
  }));
}

export function catalogEntriesForDisplay(): CatalogLeagueEntry[] {
  return LEAGUE_CATALOG.filter((entry) => {
    if (entry.leagueId && isDashboardLeagueExposed(entry.leagueId)) return true;
    if (entry.leagueId && !isLeagueAnalyticsUnlocked(entry.leagueId)) return false;
    if (!entry.leagueId && !isCatalogSlugVisible(entry.id)) return false;
    return true;
  });
}

export function catalogBySport(): { sport: CatalogSportGroup; label: string; entries: CatalogLeagueEntry[] }[] {
  const groups = new Map<CatalogSportGroup, CatalogLeagueEntry[]>();
  for (const entry of catalogEntriesForDisplay()) {
    const list = groups.get(entry.sport) ?? [];
    list.push(entry);
    groups.set(entry.sport, list);
  }
  return (Object.keys(CATALOG_SPORT_LABELS) as CatalogSportGroup[]).map((sport) => ({
    sport,
    label: CATALOG_SPORT_LABELS[sport],
    entries: (groups.get(sport) ?? []).sort((a, b) => a.sort - b.sort),
  })).filter((g) => g.entries.length > 0);
}

/** Matches verified production leagues — single source of truth with overview stats. */
export function liveCatalogCount(): number {
  return VERIFIED_LIVE_LEAGUE_IDS.length;
}

export function catalogCompetitionCount(): number {
  return catalogEntriesForDisplay().length;
}
