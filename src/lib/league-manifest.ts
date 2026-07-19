/**
 * Unified league manifest — single source of truth for IA, routes, and hub features.
 * All routed leagues use a consistent `/{leagueId}` prefix (including NBA).
 */
import type { LeagueMetricCopy } from "@/lib/leagues";

export const LEAGUE_MANIFEST_IDS = [
  "nba",
  "nhl",
  "wnba",
  "mlb",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
] as const;

export type LeagueManifestId = (typeof LEAGUE_MANIFEST_IDS)[number];

export type ResearchView = "tendencies" | "trends" | "findings" | "game-state";

export type LeagueSlateFeatures = {
  /** Upcoming games grid above tonight's slate */
  upcomingSlateSection: boolean;
  /** League-specific analytics leader cards on slate hub */
  analyticsLeaders: "nfl" | "epl" | "cfb" | "cbb" | null;
  /** NFL super bowl officiating block */
  superBowlSection: boolean;
  /** CBB/CFB conference coverage */
  conferenceCoverage: boolean;
  /** NBA offseason feature showcase */
  slateFeatureShowcase: boolean;
  /** NBA offseason quick lookup */
  slateQuickLookup: boolean;
  /** Pending crew slate notice (NFL) */
  pendingCrewNotice: boolean;
  /** NHL PP/OT signals on game cards */
  ppOtSignals: boolean;
  /** Season scope toggle on slate hero (NBA offseason) */
  seasonScopeOnSlate: boolean;
  /** Season scope toggle on findings section (NBA) */
  seasonScopeOnFindings: boolean;
  /** Hide generic offseason notice (NBA uses feature showcase instead) */
  hideOffseasonNotice: boolean;
  /** In-season findings section title override */
  findingsInSeasonTitle?: string;
};

export type LeagueManifestEntry = {
  id: LeagueManifestId;
  label: string;
  shortLabel: string;
  /** Canonical URL prefix — always `/{id}` for routed leagues */
  pathPrefix: string;
  dataLeague: "NBA" | "NHL" | "WNBA" | "MLB" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  officialNoun: string;
  officialNounPlural: string;
  seasonStatus: "offseason" | "in-season";
  metrics: LeagueMetricCopy;
  showOtRate: boolean;
  whistleFromMinors: boolean;
  /** Full hub route tree under /{id} */
  routed: boolean;
  /** Section nav tabs available for this league */
  sectionNav: Array<"slate" | "teams" | "matrix" | "refs" | "research">;
  slate: LeagueSlateFeatures;
  /** Research sub-views shipped for this league */
  researchViews: ResearchView[];
};

const NBA_METRICS: LeagueMetricCopy = {
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
};

export const LEAGUE_MANIFEST: Record<LeagueManifestId, LeagueManifestEntry> = {
  nba: {
    id: "nba",
    label: "NBA",
    shortLabel: "NBA",
    pathPrefix: "/nba",
    dataLeague: "NBA",
    officialNoun: "referee",
    officialNounPlural: "referees",
    seasonStatus: "offseason",
    showOtRate: false,
    whistleFromMinors: false,
    metrics: NBA_METRICS,
    routed: true,
    sectionNav: ["slate", "teams", "matrix", "refs", "research"],
    researchViews: ["tendencies", "trends", "findings", "game-state"],
    slate: {
      upcomingSlateSection: true,
      analyticsLeaders: null,
      superBowlSection: false,
      conferenceCoverage: false,
      slateFeatureShowcase: true,
      slateQuickLookup: true,
      pendingCrewNotice: false,
      ppOtSignals: false,
      seasonScopeOnSlate: true,
      seasonScopeOnFindings: true,
      hideOffseasonNotice: true,
      findingsInSeasonTitle: "Tonight's edges",
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
    routed: true,
    sectionNav: ["slate", "teams", "matrix", "refs", "research"],
    researchViews: ["tendencies", "trends", "findings"],
    slate: {
      upcomingSlateSection: true,
      analyticsLeaders: null,
      superBowlSection: false,
      conferenceCoverage: false,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: false,
      ppOtSignals: true,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
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
    metrics: NBA_METRICS,
    routed: true,
    sectionNav: ["slate"],
    researchViews: ["tendencies"],
    slate: {
      upcomingSlateSection: true,
      analyticsLeaders: null,
      superBowlSection: false,
      conferenceCoverage: false,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: false,
      ppOtSignals: false,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
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
    routed: false,
    sectionNav: ["slate", "research"],
    researchViews: ["tendencies"],
    slate: {
      upcomingSlateSection: false,
      analyticsLeaders: null,
      superBowlSection: false,
      conferenceCoverage: false,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: false,
      ppOtSignals: false,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
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
    routed: true,
    sectionNav: ["slate", "teams", "matrix", "refs", "research"],
    researchViews: ["tendencies", "trends", "findings", "game-state"],
    slate: {
      upcomingSlateSection: true,
      analyticsLeaders: "nfl",
      superBowlSection: true,
      conferenceCoverage: false,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: true,
      ppOtSignals: false,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
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
      whistlePlain: "cards shown",
      whistleShort: "Cards",
      scoringColumn: "Goals vs average",
      whistleColumn: "Cards vs average",
      overColumn: "Over rate",
      gamesColumn: "Matches",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most cards shown first",
      sortOverHigh: "Most overs first",
    },
    routed: true,
    sectionNav: ["slate", "teams", "matrix", "refs", "research"],
    researchViews: ["tendencies", "trends", "findings"],
    slate: {
      upcomingSlateSection: false,
      analyticsLeaders: "epl",
      superBowlSection: false,
      conferenceCoverage: false,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: false,
      ppOtSignals: false,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
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
      whistlePlain: "cards shown",
      whistleShort: "Cards",
      scoringColumn: "Goals vs average",
      whistleColumn: "Cards vs average",
      overColumn: "Over rate",
      gamesColumn: "Matches",
      sortScoringHigh: "Highest-scoring crews first",
      sortWhistleHigh: "Most cards shown first",
      sortOverHigh: "Most overs first",
    },
    routed: true,
    sectionNav: ["slate", "teams", "matrix", "refs", "research"],
    researchViews: ["tendencies", "trends", "findings"],
    slate: {
      upcomingSlateSection: false,
      analyticsLeaders: "epl",
      superBowlSection: false,
      conferenceCoverage: false,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: false,
      ppOtSignals: false,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
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
    metrics: NBA_METRICS,
    routed: true,
    sectionNav: ["slate", "teams", "matrix", "refs", "research"],
    researchViews: ["tendencies", "trends", "findings"],
    slate: {
      upcomingSlateSection: true,
      analyticsLeaders: "cbb",
      superBowlSection: false,
      conferenceCoverage: true,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: false,
      ppOtSignals: false,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
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
    routed: true,
    sectionNav: ["slate", "teams", "matrix", "refs", "research"],
    researchViews: ["tendencies", "trends", "findings"],
    slate: {
      upcomingSlateSection: false,
      analyticsLeaders: "cfb",
      superBowlSection: false,
      conferenceCoverage: true,
      slateFeatureShowcase: false,
      slateQuickLookup: false,
      pendingCrewNotice: false,
      ppOtSignals: false,
      seasonScopeOnSlate: false,
      seasonScopeOnFindings: false,
      hideOffseasonNotice: false,
    },
  },
};

export const ROUTED_LEAGUE_MANIFEST_IDS = LEAGUE_MANIFEST_IDS.filter(
  (id) => LEAGUE_MANIFEST[id].routed,
);

/** Routed leagues with a full insights hub (excludes wnba/mlb). */
export type InsightsLeagueId =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

export const INSIGHTS_LEAGUE_IDS: readonly InsightsLeagueId[] =
  ROUTED_LEAGUE_MANIFEST_IDS.filter(
    (id): id is InsightsLeagueId =>
      LEAGUE_MANIFEST[id].sectionNav.includes("research"),
  );

export function isInsightsLeagueId(value: string): value is InsightsLeagueId {
  return (INSIGHTS_LEAGUE_IDS as readonly string[]).includes(value);
}

export function leagueHasResearchView(
  leagueId: InsightsLeagueId | LeagueManifestId,
  view: ResearchView,
): boolean {
  return LEAGUE_MANIFEST[leagueId as LeagueManifestId].researchViews.includes(view);
}

export function leaguesWithResearchView(view: ResearchView): InsightsLeagueId[] {
  return INSIGHTS_LEAGUE_IDS.filter((id) => leagueHasResearchView(id, view));
}

export function leagueManifestEntry(
  leagueId: InsightsLeagueId | LeagueManifestId,
): LeagueManifestEntry {
  return LEAGUE_MANIFEST[leagueId as LeagueManifestId];
}

export const LEAGUE_SLATE_NAV_LABEL = "Slate";

export function isLeagueManifestId(value: string): value is LeagueManifestId {
  return (LEAGUE_MANIFEST_IDS as readonly string[]).includes(value);
}

export function leagueManifestPath(leagueId: LeagueManifestId, segment = ""): string {
  const prefix = LEAGUE_MANIFEST[leagueId].pathPrefix;
  if (!segment || segment === "/") return prefix;
  const path = segment.startsWith("/") ? segment : `/${segment}`;
  return `${prefix}${path}`;
}

export function leagueSlateHref(leagueId: LeagueManifestId): string {
  return LEAGUE_MANIFEST[leagueId].pathPrefix;
}

export function researchViewHref(
  leagueId: LeagueManifestId,
  view: ResearchView,
): string {
  return leagueManifestPath(leagueId, `/research/${view}`);
}

export function researchFindingHref(
  leagueId: LeagueManifestId,
  findingId: string,
): string {
  return leagueManifestPath(leagueId, `/research/findings/${findingId}`);
}

export function leagueSectionNavHref(
  leagueId: LeagueManifestId,
  section: "slate" | "teams" | "matrix" | "refs" | "research",
): string {
  switch (section) {
    case "slate":
      return leagueSlateHref(leagueId);
    case "research":
      return researchViewHref(leagueId, "tendencies");
    default:
      return leagueManifestPath(leagueId, `/${section}`);
  }
}
