import type { LeagueId } from "@/lib/leagues";
import { formatLeagueSeasonStart } from "@/config/leagueConfig";
import { isCatalogSlugVisible } from "@/config/leagues";
import {
  isProOnlyLiveLeague,
  isVerifiedLiveLeague,
  PRIMARY_LIVE_LEAGUE_IDS,
  PRO_ONLY_LIVE_LEAGUE_IDS,
  VERIFIED_LIVE_LEAGUE_IDS,
} from "@/lib/league-verification";

export type CatalogLeagueStatus = "live" | "coming-soon";

export type CatalogSportGroup =
  | "basketball"
  | "hockey"
  | "football"
  | "soccer"
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
export const LIVE_CATALOG_LEAGUE_IDS = VERIFIED_LIVE_LEAGUE_IDS;

/** Short season-start labels for overview hub badges (MM/DD). */
export function leagueSeasonStartBadge(leagueId: LeagueId): string | undefined {
  return formatLeagueSeasonStart(leagueId);
}

export function catalogStatusLabel(entry: CatalogLeagueEntry): string {
  if (entry.status === "live" && entry.leagueId) {
    return leagueSeasonStartBadge(entry.leagueId) ?? "N/A";
  }
  return "Coming Soon";
}

/**
 * Expanded competition catalog for the overview hub.
 * Coming-soon entries are roadmap only: no routes, no header switcher, no data loaders.
 */
export function catalogLeagueDisplayLabel(entry: CatalogLeagueEntry): string {
  return entry.label;
}

export const LEAGUE_CATALOG: CatalogLeagueEntry[] = [
  { id: "nba", label: "NBA", region: "USA", sport: "basketball", status: "live", leagueId: "nba", href: "/nba", sort: 1 },
  { id: "cbb", label: "NCAA Basketball", region: "USA", sport: "basketball", status: "live", leagueId: "cbb", href: "/cbb", sort: 2 },
  { id: "wnba", label: "WNBA", region: "USA", sport: "basketball", status: "coming-soon", sort: 3 },
  { id: "nhl", label: "NHL", region: "North America", sport: "hockey", status: "live", leagueId: "nhl", href: "/nhl", sort: 10 },
  { id: "nfl", label: "NFL", region: "USA", sport: "football", status: "live", leagueId: "nfl", href: "/nfl", sort: 20 },
  { id: "cfb", label: "NCAA Football", region: "USA", sport: "football", status: "coming-soon", sort: 21 },
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
  { id: "mlb", label: "MLB", region: "USA", sport: "baseball", status: "coming-soon", sort: 52 },
];

export const CATALOG_SPORT_LABELS: Record<CatalogSportGroup, string> = {
  basketball: "Basketball",
  hockey: "Hockey",
  football: "American football",
  soccer: "Football",
  baseball: "Baseball",
};

export type {
  OverviewQuickList,
  OverviewQuickListContext,
  OverviewQuickListPreview,
} from "@/lib/league-quick-lists";
export { overviewQuickListsForLeague } from "@/lib/league-quick-lists";

export function catalogEntriesForDisplay(): CatalogLeagueEntry[] {
  return LEAGUE_CATALOG.filter((entry) => {
    if (entry.leagueId) return isVerifiedLiveLeague(entry.leagueId);
    return isCatalogSlugVisible(entry.id);
  });
}

export function catalogComingSoonEntries(): CatalogLeagueEntry[] {
  return LEAGUE_CATALOG.filter(
    (entry) => entry.status === "coming-soon" && isCatalogSlugVisible(entry.id),
  );
}

/** Verified live competitions in overview hub order (all seven leagues). */
export function catalogLiveCompetitionEntries(): CatalogLeagueEntry[] {
  const order = new Map<LeagueId, number>(
    PRIMARY_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );
  return catalogEntriesForDisplay()
    .filter((entry) => entry.leagueId && entry.status === "live")
    .sort(
      (a, b) =>
        (order.get(a.leagueId!) ?? 99) - (order.get(b.leagueId!) ?? 99),
    );
}

/** Pro leagues only — sidebar and chooser primary tier. */
export function catalogProLiveEntries(): CatalogLeagueEntry[] {
  const order = new Map<LeagueId, number>(
    PRO_ONLY_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );
  return catalogEntriesForDisplay()
    .filter(
      (entry) =>
        entry.leagueId &&
        entry.status === "live" &&
        isProOnlyLiveLeague(entry.leagueId),
    )
    .sort(
      (a, b) =>
        (order.get(a.leagueId!) ?? 99) - (order.get(b.leagueId!) ?? 99),
    );
}

/** @deprecated College leagues appear in catalogComingSoonEntries. */
export function catalogCollegeComingSoonEntries(): CatalogLeagueEntry[] {
  return [];
}

/** @deprecated NCAA hubs are coming soon — use catalogCollegeComingSoonEntries. */
export function catalogCollegeLiveEntries(): CatalogLeagueEntry[] {
  return [];
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

/** Matches leagues with live product coverage right now. */
export function liveCatalogCount(): number {
  return VERIFIED_LIVE_LEAGUE_IDS.filter((leagueId) => isVerifiedLiveLeague(leagueId)).length;
}

export function catalogCompetitionCount(): number {
  return catalogEntriesForDisplay().length;
}
