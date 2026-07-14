export const LEAGUE_IDS = ["nba", "nhl", "wnba", "mlb", "nfl", "epl", "laliga", "cbb", "cfb"] as const;
export type LeagueId = (typeof LEAGUE_IDS)[number];

/** Candidate leagues for the header sport switcher (filtered by verification in production). */
export const HEADER_LEAGUE_IDS = ["nba", "nhl", "nfl", "epl", "laliga"] as const satisfies readonly LeagueId[];

export type LeagueMetricCopy = {
  /** Combined score unit: points, goals, runs */
  scoreUnit: string;
  scoreUnitPlural: string;
  /** What we call the whistle stat in plain language */
  whistlePlain: string;
  whistleShort: string;
  /** Table column headers */
  scoringColumn: string;
  whistleColumn: string;
  overColumn: string;
  gamesColumn: string;
  /** Sort labels */
  sortScoringHigh: string;
  sortWhistleHigh: string;
  sortOverHigh: string;
};

export type LeagueConfig = {
  id: LeagueId;
  label: string;
  shortLabel: string;
  /** URL prefix; empty string = site root (NBA) */
  pathPrefix: string;
  /** RefRankingsTable / types league key */
  dataLeague: "NBA" | "NHL" | "WNBA" | "MLB" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  officialNoun: string;
  officialNounPlural: string;
  seasonStatus: "offseason" | "in-season";
  metrics: LeagueMetricCopy;
  /** Show NHL-style OT column */
  showOtRate: boolean;
  /** Use nhlAnalytics.minorsDelta for whistle */
  whistleFromMinors: boolean;
};

export const LEAGUES: Record<LeagueId, LeagueConfig> = {
  nba: {
    id: "nba",
    label: "NBA",
    shortLabel: "NBA",
    pathPrefix: "",
    dataLeague: "NBA",
    officialNoun: "referee",
    officialNounPlural: "referees",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "point",
      scoreUnitPlural: "points",
      whistlePlain: "fouls called",
      whistleShort: "Fouls",
      scoringColumn: "Score vs average",
      whistleColumn: "Fouls vs average",
      overColumn: "Over rate",
      gamesColumn: "Games",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most fouls called first",
      sortOverHigh: "Most overs first",
    },
  },
  nhl: {
    id: "nhl",
    label: "NHL",
    shortLabel: "NHL",
    pathPrefix: "/nhl",
    dataLeague: "NHL",
    officialNoun: "official",
    officialNounPlural: "officials",
    seasonStatus: "offseason",
    showOtRate: true,
    whistleFromMinors: true,
    metrics: {
      scoreUnit: "goal",
      scoreUnitPlural: "goals",
      whistlePlain: "minor penalties",
      whistleShort: "Minors",
      scoringColumn: "Goals vs average",
      whistleColumn: "Minors vs average",
      overColumn: "Over rate",
      gamesColumn: "Games",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most minors first",
      sortOverHigh: "Most overs first",
    },
  },
  wnba: {
    id: "wnba",
    label: "WNBA",
    shortLabel: "WNBA",
    pathPrefix: "/wnba",
    dataLeague: "WNBA",
    officialNoun: "referee",
    officialNounPlural: "referees",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "point",
      scoreUnitPlural: "points",
      whistlePlain: "fouls called",
      whistleShort: "Fouls",
      scoringColumn: "Score vs average",
      whistleColumn: "Fouls vs average",
      overColumn: "Over rate",
      gamesColumn: "Games",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most fouls called first",
      sortOverHigh: "Most overs first",
    },
  },
  mlb: {
    id: "mlb",
    label: "MLB",
    shortLabel: "MLB",
    pathPrefix: "/mlb",
    dataLeague: "MLB",
    officialNoun: "umpire",
    officialNounPlural: "umpires",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "run",
      scoreUnitPlural: "runs",
      whistlePlain: "penalty events",
      whistleShort: "Penalties",
      scoringColumn: "Runs vs average",
      whistleColumn: "Penalties vs average",
      overColumn: "Over rate",
      gamesColumn: "Games",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most penalties first",
      sortOverHigh: "Most overs first",
    },
  },
  nfl: {
    id: "nfl",
    label: "NFL",
    shortLabel: "NFL",
    pathPrefix: "/nfl",
    dataLeague: "NFL",
    officialNoun: "official",
    officialNounPlural: "officials",
    seasonStatus: "in-season",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "point",
      scoreUnitPlural: "points",
      whistlePlain: "flags thrown",
      whistleShort: "Flags",
      scoringColumn: "Score vs average",
      whistleColumn: "Flags vs average",
      overColumn: "Over rate",
      gamesColumn: "Games",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most flags first",
      sortOverHigh: "Most overs first",
    },
  },
  epl: {
    id: "epl",
    label: "Premier League",
    shortLabel: "EPL",
    pathPrefix: "/epl",
    dataLeague: "EPL",
    officialNoun: "referee",
    officialNounPlural: "referees",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "goal",
      scoreUnitPlural: "goals",
      whistlePlain: "fouls called",
      whistleShort: "Fouls",
      scoringColumn: "Goals vs average",
      whistleColumn: "Fouls vs average",
      overColumn: "Over rate",
      gamesColumn: "Matches",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most fouls called first",
      sortOverHigh: "Most overs first",
    },
  },
  laliga: {
    id: "laliga",
    label: "La Liga",
    shortLabel: "La Liga",
    pathPrefix: "/laliga",
    dataLeague: "LALIGA",
    officialNoun: "referee",
    officialNounPlural: "referees",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "goal",
      scoreUnitPlural: "goals",
      whistlePlain: "fouls called",
      whistleShort: "Fouls",
      scoringColumn: "Goals vs average",
      whistleColumn: "Fouls vs average",
      overColumn: "Over rate",
      gamesColumn: "Matches",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most fouls called first",
      sortOverHigh: "Most overs first",
    },
  },
  cbb: {
    id: "cbb",
    label: "NCAA Basketball",
    shortLabel: "CBB",
    pathPrefix: "/cbb",
    dataLeague: "CBB",
    officialNoun: "referee",
    officialNounPlural: "referees",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "point",
      scoreUnitPlural: "points",
      whistlePlain: "fouls called",
      whistleShort: "Fouls",
      scoringColumn: "Score vs average",
      whistleColumn: "Fouls vs average",
      overColumn: "Over rate",
      gamesColumn: "Games",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most fouls called first",
      sortOverHigh: "Most overs first",
    },
  },
  cfb: {
    id: "cfb",
    label: "NCAA Football",
    shortLabel: "CFB",
    pathPrefix: "/cfb",
    dataLeague: "CFB",
    officialNoun: "official",
    officialNounPlural: "officials",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: {
      scoreUnit: "point",
      scoreUnitPlural: "points",
      whistlePlain: "flags thrown",
      whistleShort: "Flags",
      scoringColumn: "Score vs average",
      whistleColumn: "Flags vs average",
      overColumn: "Over rate",
      gamesColumn: "Games",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most flags first",
      sortOverHigh: "Most overs first",
    },
  },
};

export function leagueFromPathname(pathname: string): LeagueId {
  const path = pathname.split("?")[0];
  if (path === "/nba" || path.startsWith("/nba/")) {
    return "nba";
  }
  for (const id of LEAGUE_IDS) {
    const prefix = LEAGUES[id].pathPrefix;
    if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) {
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

/** Plain-language nav label for league game hubs (not insider "slate"). */
export const LEAGUE_GAMES_NAV_LABEL = "Games";

/** Back-link text from sub-pages to a league game hub. */
export function leagueGamesHubBackLabel(leagueId: LeagueId): string {
  return `${LEAGUES[leagueId].shortLabel} games`;
}

/** Overview hub section title — live crews vs scheduled matchups. */
export function overviewGamesSectionTitle(hasLiveCrews: boolean): string {
  return hasLiveCrews ? "Tonight" : "Upcoming";
}

/** League slate hub (distinct from SITE_HOME_PATH for NBA). */
export function leagueHubHref(leagueId: LeagueId): string {
  if (leagueId === "nba") return "/nba";
  const prefix = LEAGUES[leagueId].pathPrefix;
  return prefix || "/nba";
}

/** Header sport switcher: no league highlighted on the overview hub. */
export function headerActiveLeague(pathname: string): LeagueId | null {
  if (isOverviewPath(pathname)) return null;
  return leagueFromPathname(pathname);
}

export function leagueHref(leagueId: LeagueId, segment: string): string {
  const prefix = LEAGUES[leagueId].pathPrefix;
  if (!segment || segment === "/") return leagueHubHref(leagueId);
  const path = segment.startsWith("/") ? segment : `/${segment}`;
  return `${prefix}${path}`;
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
    { href: `${base}/rankings`, label: "Rankings" },
    { href: `${base}/teams`, label: "Teams" },
    { href: `${base}/refs`, label: "Refs" },
    { href: `${base}/trends`, label: "Trends" },
    { href: `${base}/research`, label: "Findings" },
  ];
}
