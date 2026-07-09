export const LEAGUE_IDS = ["nba", "nhl", "wnba", "mlb", "nfl", "epl", "cbb", "cfb"] as const;
export type LeagueId = (typeof LEAGUE_IDS)[number];

/** Candidate leagues for the header sport switcher (filtered by verification in production). */
export const HEADER_LEAGUE_IDS = ["nba", "nhl", "nfl", "epl"] as const satisfies readonly LeagueId[];

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
  dataLeague: "NBA" | "NHL" | "WNBA" | "MLB" | "NFL" | "EPL" | "CBB" | "CFB";
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
  cbb: {
    id: "cbb",
    label: "NCAA Men's Basketball",
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
  for (const id of LEAGUE_IDS) {
    const prefix = LEAGUES[id].pathPrefix;
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return id;
    }
  }
  return "nba";
}

export function leagueHref(leagueId: LeagueId, segment: string): string {
  const prefix = LEAGUES[leagueId].pathPrefix;
  if (!segment || segment === "/") return prefix || "/";
  const path = segment.startsWith("/") ? segment : `/${segment}`;
  return `${prefix}${path}`;
}

export function leagueNavLinks(leagueId: LeagueId) {
  const base = LEAGUES[leagueId].pathPrefix;
  return [
    { href: base || "/", label: "Slate" },
    { href: `${base}/rankings`, label: "Rankings" },
    { href: `${base}/teams`, label: "Teams" },
    { href: `${base}/refs`, label: "Refs" },
    { href: `${base}/trends`, label: "Trends" },
    { href: `${base}/research`, label: "Findings" },
  ];
}
