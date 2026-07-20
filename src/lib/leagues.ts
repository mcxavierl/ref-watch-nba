import {
  LEAGUE_MANIFEST,
  LEAGUE_MANIFEST_IDS,
  LEAGUE_SLATE_NAV_LABEL,
  leagueManifestPath,
  leagueSlateHref,
  type LeagueManifestId,
} from "@/lib/league-manifest";

export const LEAGUE_IDS = LEAGUE_MANIFEST_IDS;
export type LeagueId = LeagueManifestId;

/** Candidate leagues for the header sport switcher (filtered by verification in production). */
export const HEADER_LEAGUE_IDS = ["nba", "nhl", "nfl", "epl", "laliga", "wnba", "cbb"] as const satisfies readonly LeagueId[];

export type LeagueMetricCopy = {
  scoreUnit: string;
  scoreUnitPlural: string;
  whistlePlain: string;
  whistleShort: string;
  scoringColumn: string;
  whistleColumn: string;
  overColumn: string;
  gamesColumn: string;
  sortScoringHigh: string;
  sortWhistleHigh: string;
  sortOverHigh: string;
};

export type LeagueConfig = {
  id: LeagueId;
  label: string;
  shortLabel: string;
  /** URL prefix — always `/{id}` (see league-manifest.ts) */
  pathPrefix: string;
  dataLeague: "NBA" | "NHL" | "WNBA" | "MLB" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  officialNoun: string;
  officialNounPlural: string;
  seasonStatus: "offseason" | "in-season";
  metrics: LeagueMetricCopy;
  showOtRate: boolean;
  whistleFromMinors: boolean;
};

/** @deprecated Prefer LEAGUE_MANIFEST from league-manifest.ts */
export const LEAGUES: Record<LeagueId, LeagueConfig> = Object.fromEntries(
  LEAGUE_MANIFEST_IDS.map((id) => {
    const entry = LEAGUE_MANIFEST[id];
    return [
      id,
      {
        id: entry.id,
        label: entry.label,
        shortLabel: entry.shortLabel,
        pathPrefix: entry.pathPrefix,
        dataLeague: entry.dataLeague,
        officialNoun: entry.officialNoun,
        officialNounPlural: entry.officialNounPlural,
        seasonStatus: entry.seasonStatus,
        metrics: entry.metrics,
        showOtRate: entry.showOtRate,
        whistleFromMinors: entry.whistleFromMinors,
      },
    ];
  }),
) as Record<LeagueId, LeagueConfig>;

export function isNcaaPath(pathname: string): boolean {
  const path = pathname.split("?")[0];
  return path === "/ncaa" || path.startsWith("/ncaa/");
}

export function leagueFromPathname(pathname: string): LeagueId {
  const path = pathname.split("?")[0];
  if (isNcaaPath(path)) {
    return "cbb";
  }
  for (const id of LEAGUE_IDS) {
    const prefix = LEAGUES[id].pathPrefix;
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return id;
    }
  }
  return "nba";
}

/** Site landing page — multi-league overview hub. */
export const SITE_HOME_PATH = "/";

export function isOverviewPath(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  return path === SITE_HOME_PATH || path === "/overview";
}

/** Section nav label for league slate hubs. */
export const LEAGUE_GAMES_NAV_LABEL = LEAGUE_SLATE_NAV_LABEL;

/** Back-link text from sub-pages to a league slate hub. */
export function leagueGamesHubBackLabel(leagueId: LeagueId): string {
  return `${LEAGUES[leagueId].shortLabel} slate`;
}

/** Overview hub section title — live crews vs scheduled matchups. */
export function overviewGamesSectionTitle(hasLiveCrews: boolean): string {
  return hasLiveCrews ? "Tonight" : "Upcoming";
}

/** League slate hub. */
export function leagueHubHref(leagueId: LeagueId): string {
  return leagueSlateHref(leagueId);
}

/** Header sport switcher: no league highlighted on overview or NCAA audit hubs. */
export function headerActiveLeague(pathname: string): LeagueId | null {
  if (isOverviewPath(pathname) || isNcaaPath(pathname)) return null;
  return leagueFromPathname(pathname);
}

export function leagueHref(leagueId: LeagueId, segment: string): string {
  return leagueManifestPath(leagueId, segment);
}

/** Singular contest noun: "game" for US sports, "match" for soccer hubs. */
export function leagueGameUnit(leagueId: LeagueId): "game" | "match" {
  return LEAGUES[leagueId].metrics.gamesColumn === "Matches" ? "match" : "game";
}

/** Plural contest noun derived from league manifest gamesColumn. */
export function leagueGamesUnit(leagueId: LeagueId): string {
  return LEAGUES[leagueId].metrics.gamesColumn.toLowerCase();
}

/** Phrase for per-contest rates, e.g. "per game" or "per match". */
export function leaguePerGamePhrase(leagueId: LeagueId): string {
  return `per ${leagueGameUnit(leagueId)}`;
}

/** Capitalized contest noun for table headers and labels. */
export function leagueGamesLabel(leagueId: LeagueId): string {
  return LEAGUES[leagueId].metrics.gamesColumn;
}

/** Canonical ref profile path for a league (rankings, matrix, directory links). */
export function refProfileHref(leagueId: LeagueId, slug: string): string {
  return leagueHref(leagueId, `/refs/${slug}`);
}

export function leagueNavLinks(leagueId: LeagueId) {
  const base = LEAGUES[leagueId].pathPrefix;
  const hub = leagueHubHref(leagueId);
  return [
    { href: hub, label: LEAGUE_GAMES_NAV_LABEL },
    { href: `${base}/research/tendencies`, label: "Tendencies" },
    { href: `${base}/teams`, label: "Teams" },
    { href: `${base}/refs`, label: "Refs" },
    { href: `${base}/research/trends`, label: "Trends" },
    { href: `${base}/research/findings`, label: "Findings" },
  ];
}
