import { loadRuntimeGameLogs } from "@/lib/game-logs";
import { getCachedGameLogs, type DataLeague, type RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { FindingLeague } from "@/lib/findings-shared";
import { BETTING_EDGE_MIN_PTS } from "@/lib/findings-significance";
import { enrichRefStatsWithGeography, resolveRefBirthplace } from "@/lib/ref-geography";
import { getCachedRefStats } from "@/lib/ref-stats-preload";
import { wilsonScoreInterval, formatWilsonPct } from "@/lib/stats-query/wilson-ci";
import { hasClosingSpreadLine, teamAtsResult } from "@/lib/team-ats";
import { NBA_TEAMS } from "@/lib/teams";
import { NFL_TEAMS } from "@/lib/nfl/teams";
import { NHL_TEAMS } from "@/lib/nhl/teams";
import { EPL_TEAMS } from "@/lib/epl/teams";
import { LALIGA_TEAMS } from "@/lib/laliga/teams";
import { WNBA_TEAMS } from "@/lib/wnba/teams";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";
import {
  freezeWorkerConfig,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

/** Minimum regional-game sample before a trend can surface as a top finding. */
export const MIN_REGIONAL_GAMES = 35;

/** Minimum non-regional games required for a stable baseline comparison. */
export const MIN_BASELINE_GAMES = 35;

/** Max Wilson 95% CI width (proportion) for a high-confidence regional rate. */
export const HIGH_CONFIDENCE_MAX_CI_WIDTH = 0.25;

/** Minimum absolute rate delta (proportion) between regional and baseline buckets. */
export const MIN_SIGNAL_DELTA = BETTING_EDGE_MIN_PTS + 0.03;

export type GeoArchetype =
  | "hometown-alignment"
  | "overcompensation-counter-bias";

export type GeoSignalKind = "win" | "cover" | "whistle";

export interface GeoRegionalTerritory {
  territoryId: string;
  label: string;
  teamAbbrs: readonly string[];
}

export interface GeoCorrelationFinding {
  id: string;
  refSlug: string;
  refName: string;
  league: FindingLeague;
  birthplace: string;
  territory: GeoRegionalTerritory;
  archetype: GeoArchetype;
  signal: GeoSignalKind;
  regionalGames: number;
  baselineGames: number;
  regionalRate: number;
  baselineRate: number;
  deltaPp: number;
  confidenceInterval: { low: number; high: number };
  highConfidence: boolean;
  headline: string;
  summary: string;
}

type TeamGeo = { abbr: string; city: string; division?: string };

const LEAGUE_TO_DATA: Record<FindingLeague, DataLeague> = {
  NBA: "NBA",
  NHL: "NHL",
  NFL: "NFL",
  EPL: "EPL",
  LALIGA: "LALIGA",
  CBB: "CBB",
  CFB: "CFB",
  WNBA: "WNBA",
};

const LEAGUE_ID_TO_FINDING: Record<(typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number], FindingLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  wnba: "WNBA",
};

const TEAMS_BY_LEAGUE: Record<FindingLeague, TeamGeo[]> = {
  NBA: NBA_TEAMS,
  NFL: NFL_TEAMS,
  NHL: NHL_TEAMS,
  EPL: EPL_TEAMS,
  LALIGA: LALIGA_TEAMS,
  CBB: [],
  CFB: [],
  WNBA: WNBA_TEAMS.map((team) => ({ abbr: team.abbr, city: team.city })),
};

const CITY_ALIASES: Record<string, string[]> = {
  "los angeles": ["la", "los angeles", "l.a."],
  "new york": ["new york", "brooklyn", "ny", "manhattan"],
  "golden state": ["san francisco", "oakland", "golden state"],
  indiana: ["indianapolis", "indiana"],
  carolina: ["charlotte", "carolina"],
  tampa: ["tampa bay", "tampa"],
  boston: ["boston", "cambridge", "worcester"],
  seville: ["seville", "sevilla"],
  madrid: ["madrid"],
  barcelona: ["barcelona", "catalonia", "catalunya"],
};

const US_STATE_ALIASES: Record<string, string> = {
  ma: "massachusetts",
  mass: "massachusetts",
  massachusetts: "massachusetts",
  ca: "california",
  calif: "california",
  california: "california",
  ny: "new york",
  "new york": "new york",
  tx: "texas",
  texas: "texas",
  fl: "florida",
  florida: "florida",
  il: "illinois",
  illinois: "illinois",
  pa: "pennsylvania",
  pennsylvania: "pennsylvania",
  oh: "ohio",
  ohio: "ohio",
  mi: "michigan",
  michigan: "michigan",
  ga: "georgia",
  georgia: "georgia",
  nc: "north carolina",
  "north carolina": "north carolina",
  wa: "washington",
  washington: "washington",
  co: "colorado",
  colorado: "colorado",
  az: "arizona",
  arizona: "arizona",
  tn: "tennessee",
  tennessee: "tennessee",
  mo: "missouri",
  missouri: "missouri",
  wi: "wisconsin",
  wisconsin: "wisconsin",
  mn: "minnesota",
  minnesota: "minnesota",
  or: "oregon",
  oregon: "oregon",
  nv: "nevada",
  nevada: "nevada",
  la: "louisiana",
  louisiana: "louisiana",
  md: "maryland",
  maryland: "maryland",
  va: "virginia",
  virginia: "virginia",
  nj: "new jersey",
  "new jersey": "new jersey",
  ct: "connecticut",
  connecticut: "connecticut",
  in: "indiana",
  indiana: "indiana",
  ut: "utah",
  utah: "utah",
  ok: "oklahoma",
  oklahoma: "oklahoma",
  ky: "kentucky",
  kentucky: "kentucky",
  on: "ontario",
  ontario: "ontario",
  qc: "quebec",
  quebec: "quebec",
};

/**
 * Regional mapping matrix: canonical region keys to league team territory IDs.
 * Keys are normalized tokens from birthplace city/region strings.
 */
const REGIONAL_MAPPING_MATRIX = freezeWorkerConfig({
  massachusetts: {
    NBA: { territoryId: "us-new-england", label: "New England", teams: ["BOS"] },
    NFL: { territoryId: "us-new-england", label: "New England", teams: ["NE"] },
    NHL: { territoryId: "us-new-england", label: "New England", teams: ["BOS"] },
  },
  "new england": {
    NBA: { territoryId: "us-new-england", label: "New England", teams: ["BOS"] },
    NFL: { territoryId: "us-new-england", label: "New England", teams: ["NE", "BUF"] },
    NHL: { territoryId: "us-new-england", label: "New England", teams: ["BOS"] },
  },
  california: {
    NBA: {
      territoryId: "us-california",
      label: "California",
      teams: ["LAL", "LAC", "GSW", "SAC"],
    },
    NFL: {
      territoryId: "us-california",
      label: "California",
      teams: ["LAR", "LAC", "SF"],
    },
    NHL: {
      territoryId: "us-california",
      label: "California",
      teams: ["LAK", "ANA", "SJS"],
    },
  },
  texas: {
    NBA: {
      territoryId: "us-texas",
      label: "Texas",
      teams: ["DAL", "HOU", "SAS"],
    },
    NFL: { territoryId: "us-texas", label: "Texas", teams: ["DAL", "HOU"] },
    NHL: { territoryId: "us-texas", label: "Texas", teams: ["DAL"] },
  },
  florida: {
    NBA: { territoryId: "us-florida", label: "Florida", teams: ["MIA", "ORL"] },
    NFL: { territoryId: "us-florida", label: "Florida", teams: ["MIA", "TB", "JAX"] },
    NHL: { territoryId: "us-florida", label: "Florida", teams: ["FLA", "TBL"] },
  },
  illinois: {
    NBA: { territoryId: "us-illinois", label: "Illinois", teams: ["CHI"] },
    NFL: { territoryId: "us-illinois", label: "Illinois", teams: ["CHI"] },
    NHL: { territoryId: "us-illinois", label: "Illinois", teams: ["CHI"] },
  },
  pennsylvania: {
    NBA: { territoryId: "us-pennsylvania", label: "Pennsylvania", teams: ["PHI"] },
    NFL: {
      territoryId: "us-pennsylvania",
      label: "Pennsylvania",
      teams: ["PHI", "PIT"],
    },
    NHL: {
      territoryId: "us-pennsylvania",
      label: "Pennsylvania",
      teams: ["PHI", "PIT"],
    },
  },
  ohio: {
    NBA: { territoryId: "us-ohio", label: "Ohio", teams: ["CLE"] },
    NFL: { territoryId: "us-ohio", label: "Ohio", teams: ["CLE", "CIN"] },
    NHL: { territoryId: "us-ohio", label: "Ohio", teams: ["CBJ"] },
  },
  michigan: {
    NBA: { territoryId: "us-michigan", label: "Michigan", teams: ["DET"] },
    NFL: { territoryId: "us-michigan", label: "Michigan", teams: ["DET"] },
    NHL: { territoryId: "us-michigan", label: "Michigan", teams: ["DET"] },
  },
  georgia: {
    NBA: { territoryId: "us-georgia", label: "Georgia", teams: ["ATL"] },
    NFL: { territoryId: "us-georgia", label: "Georgia", teams: ["ATL"] },
  },
  "north carolina": {
    NBA: { territoryId: "us-carolinas", label: "Carolinas", teams: ["CHA"] },
    NFL: { territoryId: "us-carolinas", label: "Carolinas", teams: ["CAR"] },
  },
  washington: {
    NBA: { territoryId: "us-pacific-nw", label: "Pacific Northwest", teams: ["POR"] },
    NFL: { territoryId: "us-pacific-nw", label: "Pacific Northwest", teams: ["SEA"] },
    NHL: {
      territoryId: "us-pacific-nw",
      label: "Pacific Northwest",
      teams: ["SEA", "VAN"],
    },
  },
  colorado: {
    NBA: { territoryId: "us-colorado", label: "Colorado", teams: ["DEN"] },
    NFL: { territoryId: "us-colorado", label: "Colorado", teams: ["DEN"] },
    NHL: { territoryId: "us-colorado", label: "Colorado", teams: ["COL"] },
  },
  arizona: {
    NBA: { territoryId: "us-arizona", label: "Arizona", teams: ["PHX"] },
    NFL: { territoryId: "us-arizona", label: "Arizona", teams: ["ARI"] },
  },
  tennessee: {
    NBA: { territoryId: "us-tennessee", label: "Tennessee", teams: ["MEM"] },
    NFL: { territoryId: "us-tennessee", label: "Tennessee", teams: ["TEN"] },
  },
  missouri: {
    NBA: { territoryId: "us-missouri", label: "Missouri", teams: [] },
    NFL: { territoryId: "us-missouri", label: "Missouri", teams: ["KC"] },
    NHL: { territoryId: "us-missouri", label: "Missouri", teams: ["STL"] },
  },
  wisconsin: {
    NBA: { territoryId: "us-wisconsin", label: "Wisconsin", teams: ["MIL"] },
    NFL: { territoryId: "us-wisconsin", label: "Wisconsin", teams: ["GB"] },
  },
  minnesota: {
    NBA: { territoryId: "us-minnesota", label: "Minnesota", teams: ["MIN"] },
    NFL: { territoryId: "us-minnesota", label: "Minnesota", teams: ["MIN"] },
    NHL: { territoryId: "us-minnesota", label: "Minnesota", teams: ["MIN"] },
  },
  oregon: {
    NBA: { territoryId: "us-oregon", label: "Oregon", teams: ["POR"] },
    NFL: { territoryId: "us-oregon", label: "Oregon", teams: ["SEA"] },
  },
  louisiana: {
    NBA: { territoryId: "us-louisiana", label: "Louisiana", teams: ["NOP"] },
    NFL: { territoryId: "us-louisiana", label: "Louisiana", teams: ["NO"] },
  },
  maryland: {
    NBA: { territoryId: "us-mid-atlantic", label: "Mid-Atlantic", teams: ["WAS"] },
    NFL: { territoryId: "us-mid-atlantic", label: "Mid-Atlantic", teams: ["WAS", "BAL"] },
    NHL: { territoryId: "us-mid-atlantic", label: "Mid-Atlantic", teams: ["WSH"] },
  },
  virginia: {
    NBA: { territoryId: "us-mid-atlantic", label: "Mid-Atlantic", teams: ["WAS"] },
    NFL: { territoryId: "us-mid-atlantic", label: "Mid-Atlantic", teams: ["WAS"] },
  },
  "new jersey": {
    NBA: { territoryId: "us-tri-state", label: "Tri-State", teams: ["BKN", "NYK"] },
    NFL: { territoryId: "us-tri-state", label: "Tri-State", teams: ["NYG", "NYJ"] },
    NHL: {
      territoryId: "us-tri-state",
      label: "Tri-State",
      teams: ["NJD", "NYI", "NYR"],
    },
  },
  "new york": {
    NBA: { territoryId: "us-tri-state", label: "Tri-State", teams: ["BKN", "NYK"] },
    NFL: { territoryId: "us-tri-state", label: "Tri-State", teams: ["NYG", "NYJ", "BUF"] },
    NHL: {
      territoryId: "us-tri-state",
      label: "Tri-State",
      teams: ["NYI", "NYR", "BUF"],
    },
    EPL: {
      territoryId: "uk-none",
      label: "England",
      teams: [],
    },
  },
  indiana: {
    NBA: { territoryId: "us-indiana", label: "Indiana", teams: ["IND"] },
    NFL: { territoryId: "us-indiana", label: "Indiana", teams: ["IND"] },
  },
  utah: {
    NBA: { territoryId: "us-utah", label: "Utah", teams: ["UTA"] },
    NHL: { territoryId: "us-utah", label: "Utah", teams: ["UTA"] },
  },
  oklahoma: {
    NBA: { territoryId: "us-oklahoma", label: "Oklahoma", teams: ["OKC"] },
  },
  ontario: {
    NBA: { territoryId: "ca-ontario", label: "Ontario", teams: ["TOR"] },
    NHL: { territoryId: "ca-ontario", label: "Ontario", teams: ["TOR", "OTT"] },
  },
  quebec: {
    NHL: { territoryId: "ca-quebec", label: "Quebec", teams: ["MTL"] },
  },
  andalusia: {
    LALIGA: {
      territoryId: "es-andalusia",
      label: "Andalusia",
      teams: ["SEV", "BET", "CAD", "ALM", "GRN"],
    },
  },
  andalucia: {
    LALIGA: {
      territoryId: "es-andalusia",
      label: "Andalusia",
      teams: ["SEV", "BET", "CAD", "ALM", "GRN"],
    },
  },
  seville: {
    LALIGA: {
      territoryId: "es-andalusia",
      label: "Andalusia",
      teams: ["SEV", "BET", "CAD", "ALM", "GRN"],
    },
  },
  sevilla: {
    LALIGA: {
      territoryId: "es-andalusia",
      label: "Andalusia",
      teams: ["SEV", "BET", "CAD", "ALM", "GRN"],
    },
  },
  catalonia: {
    LALIGA: {
      territoryId: "es-catalonia",
      label: "Catalonia",
      teams: ["BAR", "GIR", "ESP"],
    },
  },
  catalunya: {
    LALIGA: {
      territoryId: "es-catalonia",
      label: "Catalonia",
      teams: ["BAR", "GIR", "ESP"],
    },
  },
  barcelona: {
    LALIGA: {
      territoryId: "es-catalonia",
      label: "Catalonia",
      teams: ["BAR", "GIR", "ESP"],
    },
  },
  madrid: {
    LALIGA: {
      territoryId: "es-madrid",
      label: "Madrid Community",
      teams: ["RMA", "ATM", "GET", "RAY", "LEG"],
    },
  },
  valencia: {
    LALIGA: {
      territoryId: "es-valencia",
      label: "Valencia Community",
      teams: ["VAL", "LEV", "ELC"],
    },
  },
  basque: {
    LALIGA: {
      territoryId: "es-basque",
      label: "Basque Country",
      teams: ["ATH", "RSO", "ALA"],
    },
  },
  galicia: {
    LALIGA: {
      territoryId: "es-galicia",
      label: "Galicia",
      teams: ["CEL", "DEP"],
    },
  },
  london: {
    EPL: {
      territoryId: "uk-greater-london",
      label: "Greater London",
      teams: ["ARS", "CHE", "CRY", "FUL", "TOT", "WHU"],
    },
  },
  manchester: {
    EPL: {
      territoryId: "uk-greater-manchester",
      label: "Greater Manchester",
      teams: ["MUN", "MCI"],
    },
  },
  liverpool: {
    EPL: {
      territoryId: "uk-merseyside",
      label: "Merseyside",
      teams: ["LIV", "EVE"],
    },
  },
  merseyside: {
    EPL: {
      territoryId: "uk-merseyside",
      label: "Merseyside",
      teams: ["LIV", "EVE"],
    },
  },
  birmingham: {
    EPL: {
      territoryId: "uk-west-midlands",
      label: "West Midlands",
      teams: ["AVL", "WOL"],
    },
  },
  newcastle: {
    EPL: {
      territoryId: "uk-north-east",
      label: "North East",
      teams: ["NEW"],
    },
  },
  yorkshire: {
    EPL: {
      territoryId: "uk-yorkshire",
      label: "Yorkshire",
      teams: ["LEE"],
    },
  },
  scotland: {
    EPL: { territoryId: "uk-scotland", label: "Scotland", teams: [] },
  },
  england: {
    EPL: { territoryId: "uk-england", label: "England", teams: [] },
  },
  spain: {
    LALIGA: { territoryId: "es-spain", label: "Spain", teams: [] },
  },
} as const);

interface RateBucket {
  successes: number;
  trials: number;
  coverWins: number;
  coverTrials: number;
  whistleSum: number;
  whistleGames: number;
}

interface ParsedBirthplace {
  city: string;
  region: string;
}

function normalizeGeoToken(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "");
}

function canonicalStateToken(region: string): string | null {
  const norm = normalizeGeoToken(region);
  return US_STATE_ALIASES[norm] ?? null;
}

function parseBirthplace(value: string): ParsedBirthplace {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return { city: value.trim(), region: value.trim() };
  }
  return {
    city: parts[0]!,
    region: parts[parts.length - 1]!,
  };
}

function cityTokens(city: string): string[] {
  const norm = normalizeGeoToken(city);
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.includes(norm) || norm === canonical) {
      return aliases;
    }
  }
  return [norm];
}

type MatrixLeagueEntry = {
  territoryId: string;
  label: string;
  teams: readonly string[];
};

function lookupMatrixTerritory(
  key: string,
  league: FindingLeague,
): GeoRegionalTerritory | null {
  const row = REGIONAL_MAPPING_MATRIX[key as keyof typeof REGIONAL_MAPPING_MATRIX];
  if (!row) return null;
  const leagueRow = row[league as keyof typeof row] as MatrixLeagueEntry | undefined;
  if (!leagueRow || leagueRow.teams.length === 0) return null;
  return {
    territoryId: leagueRow.territoryId,
    label: leagueRow.label,
    teamAbbrs: leagueRow.teams,
  };
}

function territoryFromTeamCity(
  city: string,
  league: FindingLeague,
): GeoRegionalTerritory | null {
  const tokens = cityTokens(city);
  const teams = TEAMS_BY_LEAGUE[league];
  const matches = teams.filter((team) => {
    const teamTokens = cityTokens(team.city);
    return tokens.some((birth) =>
      teamTokens.some((teamToken) =>
        teamToken.includes(birth) || birth.includes(teamToken),
      ),
    );
  });
  if (matches.length === 0) return null;
  const abbrs = [...new Set(matches.map((team) => team.abbr))];
  const label =
    matches[0]?.division != null
      ? `${matches[0].division} territory`
      : `${matches[0]?.city ?? city} territory`;
  return {
    territoryId: `city-${normalizeGeoToken(city)}`,
    label,
    teamAbbrs: abbrs,
  };
}

/** Map an official birthplace/hometown string to league team territory IDs. */
export function resolveOfficialTerritories(
  geo: string,
  league: FindingLeague,
): GeoRegionalTerritory[] {
  const parsed = parseBirthplace(geo);
  const keys = new Set<string>();

  for (const token of cityTokens(parsed.city)) {
    keys.add(token);
  }
  keys.add(normalizeGeoToken(parsed.region));
  const state = canonicalStateToken(parsed.region);
  if (state) keys.add(state);

  const territories = new Map<string, GeoRegionalTerritory>();

  for (const key of keys) {
    const fromMatrix = lookupMatrixTerritory(key, league);
    if (fromMatrix) {
      territories.set(fromMatrix.territoryId, fromMatrix);
    }
  }

  const fromCity = territoryFromTeamCity(parsed.city, league);
  if (fromCity) {
    territories.set(fromCity.territoryId, fromCity);
  }

  return [...territories.values()];
}

export function teamInTerritory(
  teamAbbr: string,
  territory: GeoRegionalTerritory,
): boolean {
  const upper = teamAbbr.toUpperCase();
  return territory.teamAbbrs.some((abbr) => abbr.toUpperCase() === upper);
}

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function emptyBucket(): RateBucket {
  return {
    successes: 0,
    trials: 0,
    coverWins: 0,
    coverTrials: 0,
    whistleSum: 0,
    whistleGames: 0,
  };
}

function whistleBurdenForTeam(
  game: RuntimeGameLogEntry,
  isHome: boolean,
  league: DataLeague,
): number | null {
  if (league === "NFL") {
    const flags = isHome ? game.homeFlags : game.awayFlags;
    if (typeof flags === "number") return flags;
    const yards = isHome ? game.homePenaltyYards : game.awayPenaltyYards;
    if (typeof yards === "number") return yards;
    return null;
  }

  if (league === "NHL") {
    const minors = isHome ? game.homeMinors : game.awayMinors;
    return typeof minors === "number" ? minors : null;
  }

  const extended = game as RuntimeGameLogEntry & {
    homeFouls?: number;
    awayFouls?: number;
    homeYellowCards?: number;
    awayYellowCards?: number;
  };

  if (league === "EPL" || league === "LALIGA") {
    const fouls = isHome ? extended.homeFouls : extended.awayFouls;
    if (typeof fouls === "number") return fouls;
    const cards = isHome ? extended.homeYellowCards : extended.awayYellowCards;
    if (typeof cards === "number") return cards;
  }

  return null;
}

function addWhistleSample(
  bucket: RateBucket,
  game: RuntimeGameLogEntry,
  isHome: boolean,
  league: DataLeague,
): void {
  const burden = whistleBurdenForTeam(game, isHome, league);
  if (burden === null) return;
  bucket.whistleSum += burden;
  bucket.whistleGames += 1;
}

function addBaselineWhistleSamples(
  bucket: RateBucket,
  game: RuntimeGameLogEntry,
  league: DataLeague,
): void {
  addWhistleSample(bucket, game, true, league);
  addWhistleSample(bucket, game, false, league);
}

function rateFromBucket(bucket: RateBucket, signal: GeoSignalKind): number | null {
  if (signal === "whistle") {
    if (bucket.whistleGames === 0) return null;
    return bucket.whistleSum / bucket.whistleGames;
  }
  if (bucket.trials === 0) return null;
  return bucket.successes / bucket.trials;
}

function wilsonIntervalsDisjoint(
  a: { low: number; high: number },
  b: { low: number; high: number },
): boolean {
  return a.low > b.high || b.low > a.high;
}

function passesProportionGate(
  regional: RateBucket,
  baseline: RateBucket,
  delta: number,
): { ok: boolean; ci: { low: number; high: number } } {
  const ci = wilsonScoreInterval(regional.successes, regional.trials);
  const baselineCi = wilsonScoreInterval(baseline.successes, baseline.trials);

  if (regional.trials < MIN_REGIONAL_GAMES) {
    return { ok: false, ci };
  }
  if (baseline.trials < MIN_BASELINE_GAMES) {
    return { ok: false, ci };
  }
  if (Math.abs(delta) < MIN_SIGNAL_DELTA) {
    return { ok: false, ci };
  }
  if (ci.high - ci.low > HIGH_CONFIDENCE_MAX_CI_WIDTH) {
    return { ok: false, ci };
  }
  if (!wilsonIntervalsDisjoint(ci, baselineCi)) {
    return { ok: false, ci };
  }

  return { ok: true, ci };
}

function passesWhistleGate(
  regional: RateBucket,
  baseline: RateBucket,
  delta: number,
): boolean {
  if (regional.whistleGames < MIN_REGIONAL_GAMES) return false;
  if (baseline.whistleGames < MIN_BASELINE_GAMES * 2) return false;
  const regionalRate = rateFromBucket(regional, "whistle");
  const baselineRate = rateFromBucket(baseline, "whistle");
  if (regionalRate === null || baselineRate === null) return false;
  if (Math.abs(delta) < 0.75) return false;
  const relativeSwing = Math.abs(regionalRate - baselineRate) / Math.max(baselineRate, 0.1);
  return relativeSwing >= 0.12;
}

function classifyArchetype(
  signal: GeoSignalKind,
  delta: number,
): GeoArchetype | null {
  if (signal === "whistle") {
    if (delta <= -0.75) return "hometown-alignment";
    if (delta >= 0.75) return "overcompensation-counter-bias";
    return null;
  }
  if (delta >= MIN_SIGNAL_DELTA) return "hometown-alignment";
  if (delta <= -MIN_SIGNAL_DELTA) return "overcompensation-counter-bias";
  return null;
}

function formatRatePct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

function buildFindingCopy(
  ref: RefProfile,
  territory: GeoRegionalTerritory,
  archetype: GeoArchetype,
  signal: GeoSignalKind,
  regionalRate: number,
  baselineRate: number,
  regionalGames: number,
): { headline: string; summary: string } {
  const signalLabel =
    signal === "win"
      ? "win rate"
      : signal === "cover"
        ? "ATS cover rate"
        : "penalty frequency";

  const direction =
    archetype === "hometown-alignment" ? "elevated" : "suppressed";

  const headline = `${ref.name}: ${direction} ${signalLabel} in ${territory.label} games`;
  const summary =
    archetype === "hometown-alignment"
      ? `Across ${regionalGames} regional assignments, ${signalLabel} for ${territory.label} clubs runs ${formatRatePct(regionalRate)} vs a ${formatRatePct(baselineRate)} non-regional baseline. Pattern is descriptive only.`
      : `Across ${regionalGames} regional assignments, ${signalLabel} against ${territory.label} clubs runs ${formatRatePct(regionalRate)} vs a ${formatRatePct(baselineRate)} non-regional baseline, suggesting a counter-bias swing. Pattern is descriptive only.`;

  return { headline, summary };
}

interface RefGeoAccumulator {
  ref: RefProfile;
  birthplace: string;
  territory: GeoRegionalTerritory;
  regional: RateBucket;
  baseline: RateBucket;
}

function recordRegionalSide(
  bucket: RateBucket,
  game: RuntimeGameLogEntry,
  isHome: boolean,
  league: DataLeague,
): void {
  const teamWin =
    (isHome && game.homeScore > game.awayScore) ||
    (!isHome && game.awayScore > game.homeScore);

  bucket.trials += 1;
  if (teamWin) bucket.successes += 1;

  const hasLine = hasClosingSpreadLine(game);
  const ats = teamAtsResult(
    isHome,
    game.homeScore,
    game.awayScore,
    game.homeSpread,
    hasLine,
  );
  if (ats === "win" || ats === "loss") {
    bucket.coverTrials += 1;
    if (ats === "win") bucket.coverWins += 1;
  }

  addWhistleSample(bucket, game, isHome, league);
}

function recordBaselineGame(
  bucket: RateBucket,
  game: RuntimeGameLogEntry,
  league: DataLeague,
): void {
  bucket.trials += 1;
  if (game.homeScore > game.awayScore) bucket.successes += 1;

  const hasLine = hasClosingSpreadLine(game);
  const homeAts = teamAtsResult(
    true,
    game.homeScore,
    game.awayScore,
    game.homeSpread,
    hasLine,
  );
  if (homeAts === "win" || homeAts === "loss") {
    bucket.coverTrials += 1;
    if (homeAts === "win") bucket.coverWins += 1;
  }

  addBaselineWhistleSamples(bucket, game, league);
}

function scanRefTerritoryGames(
  ref: RefProfile,
  birthplace: string,
  territory: GeoRegionalTerritory,
  games: RuntimeGameLogEntry[],
  league: DataLeague,
): RefGeoAccumulator {
  const slug = ref.slug;
  const regional = emptyBucket();
  const baseline = emptyBucket();
  const teamSet = new Set(territory.teamAbbrs.map((abbr) => abbr.toUpperCase()));

  for (const game of games) {
    const officiated = game.officials.some(
      (official) => refSlug(official.name, official.number) === slug,
    );
    if (!officiated) continue;

    const homeRegional = teamSet.has(game.homeTeam.toUpperCase());
    const awayRegional = teamSet.has(game.awayTeam.toUpperCase());

    if (homeRegional) recordRegionalSide(regional, game, true, league);
    if (awayRegional) recordRegionalSide(regional, game, false, league);

    if (!homeRegional && !awayRegional) {
      recordBaselineGame(baseline, game, league);
    }
  }

  return { ref, birthplace, territory, regional, baseline };
}

function evaluateSignal(
  acc: RefGeoAccumulator,
  league: FindingLeague,
  signal: GeoSignalKind,
): GeoCorrelationFinding | null {
  let regionalRate: number | null;
  let baselineRate: number | null;
  let regionalTrials = 0;
  let baselineTrials = 0;
  let regionalSuccesses = 0;
  let baselineSuccesses = 0;

  if (signal === "cover") {
    regionalTrials = acc.regional.coverTrials;
    baselineTrials = acc.baseline.coverTrials;
    regionalSuccesses = acc.regional.coverWins;
    baselineSuccesses = acc.baseline.coverWins;
    if (regionalTrials === 0 || baselineTrials === 0) return null;
    regionalRate = regionalSuccesses / regionalTrials;
    baselineRate = baselineSuccesses / baselineTrials;
  } else if (signal === "whistle") {
    regionalRate = rateFromBucket(acc.regional, "whistle");
    baselineRate = rateFromBucket(acc.baseline, "whistle");
    regionalTrials = acc.regional.whistleGames;
    baselineTrials = acc.baseline.whistleGames;
    if (regionalRate === null || baselineRate === null) return null;
  } else {
    regionalTrials = acc.regional.trials;
    baselineTrials = acc.baseline.trials;
    regionalSuccesses = acc.regional.successes;
    baselineSuccesses = acc.baseline.successes;
    if (regionalTrials === 0 || baselineTrials === 0) return null;
    regionalRate = regionalSuccesses / regionalTrials;
    baselineRate = baselineSuccesses / baselineTrials;
  }

  const delta = regionalRate - baselineRate;
  const archetype = classifyArchetype(signal, delta);
  if (!archetype) return null;

  let highConfidence = false;
  let ci = { low: 0, high: 0 };

  if (signal === "whistle") {
    highConfidence = passesWhistleGate(acc.regional, acc.baseline, delta);
    if (!highConfidence) return null;
  } else {
    const gateBucket: RateBucket = {
      successes: regionalSuccesses,
      trials: regionalTrials,
      coverWins: 0,
      coverTrials: 0,
      whistleSum: 0,
      whistleGames: 0,
    };
    const baselineGate: RateBucket = {
      successes: baselineSuccesses,
      trials: baselineTrials,
      coverWins: 0,
      coverTrials: 0,
      whistleSum: 0,
      whistleGames: 0,
    };
    const gate = passesProportionGate(gateBucket, baselineGate, delta);
    if (!gate.ok) return null;
    highConfidence = true;
    ci = gate.ci;
  }

  const { headline, summary } = buildFindingCopy(
    acc.ref,
    acc.territory,
    archetype,
    signal,
    regionalRate,
    baselineRate,
    signal === "whistle" ? acc.regional.whistleGames : regionalTrials,
  );

  const summaryWithCi =
    signal === "whistle"
      ? summary
      : `${summary} Wilson 95% CI: ${formatWilsonPct(ci.low, ci.high)}.`;

  return {
    id: `geo-${league.toLowerCase()}-${acc.ref.slug}-${acc.territory.territoryId}-${signal}-${archetype}`,
    refSlug: acc.ref.slug,
    refName: acc.ref.name,
    league,
    birthplace: acc.birthplace,
    territory: acc.territory,
    archetype,
    signal,
    regionalGames: signal === "whistle" ? acc.regional.whistleGames : regionalTrials,
    baselineGames: signal === "whistle" ? acc.baseline.whistleGames : baselineTrials,
    regionalRate,
    baselineRate,
    deltaPp: Math.round(delta * 1000) / 10,
    confidenceInterval: ci,
    highConfidence,
    headline,
    summary: summaryWithCi,
  };
}

function findingsFromAccumulator(
  acc: RefGeoAccumulator,
  league: FindingLeague,
): GeoCorrelationFinding[] {
  const findings: GeoCorrelationFinding[] = [];
  for (const signal of ["win", "cover", "whistle"] as const) {
    const finding = evaluateSignal(acc, league, signal);
    if (finding) findings.push(finding);
  }
  return findings;
}

/** Scan historical game logs for bidirectional geographic anomalies for one league. */
export function computeGeoCorrelationsForLeague(
  league: FindingLeague,
  stats: RefStatsFile,
  gameLogs: RuntimeGameLogEntry[] | null | undefined,
): GeoCorrelationFinding[] {
  if (!gameLogs?.length) return [];

  const dataLeague = LEAGUE_TO_DATA[league];
  const enriched = enrichRefStatsWithGeography(
    league.toLowerCase() as LeagueId,
    stats,
  );

  const refsWithGeo = enriched.refs.filter((ref) => {
    const geo = resolveRefBirthplace(ref.slug, enriched, league);
    return Boolean(geo);
  });

  const findings: GeoCorrelationFinding[] = [];

  for (const ref of refsWithGeo) {
    const birthplace = resolveRefBirthplace(ref.slug, enriched, league);
    if (!birthplace) continue;

    const territories = resolveOfficialTerritories(birthplace, league);
    if (territories.length === 0) continue;

    for (const territory of territories) {
      const acc = scanRefTerritoryGames(
        ref,
        birthplace,
        territory,
        gameLogs,
        dataLeague,
      );
      findings.push(...findingsFromAccumulator(acc, league));
      releaseParsedPayload(acc);
    }
  }

  releaseParsedPayload(refsWithGeo);
  return findings.sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp));
}

/** Request-scoped geographic anomalies for a single official. */
export function computeRefGeoCorrelations(
  leagueId: LeagueId,
  profile: RefProfile,
  stats: RefStatsFile,
  gameLogs?: RuntimeGameLogEntry[] | null,
): GeoCorrelationFinding[] {
  if (!(PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
    return [];
  }

  const findingLeague =
    LEAGUE_ID_TO_FINDING[leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number]];
  const dataLeague = LEAGUE_TO_DATA[findingLeague];
  const logs =
    gameLogs ?? loadRuntimeGameLogs(dataLeague)?.games ?? getCachedGameLogs(dataLeague)?.games ?? null;
  if (!logs?.length) return [];

  const enriched = enrichRefStatsWithGeography(leagueId, stats);
  const birthplace = resolveRefBirthplace(profile.slug, enriched, findingLeague);
  if (!birthplace) return [];

  const territories = resolveOfficialTerritories(birthplace, findingLeague);
  if (territories.length === 0) return [];

  const findings: GeoCorrelationFinding[] = [];

  for (const territory of territories) {
    const acc = scanRefTerritoryGames(
      profile,
      birthplace,
      territory,
      logs,
      dataLeague,
    );
    findings.push(...findingsFromAccumulator(acc, findingLeague));
    releaseParsedPayload(acc);
  }

  return findings
    .filter((row) => row.refSlug === profile.slug && isTopGeoFinding(row))
    .sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp));
}

/** Worker-safe: pull cached stats + game logs for all five live leagues. */
export function computeAllGeoCorrelations(): GeoCorrelationFinding[] {
  const all: GeoCorrelationFinding[] = [];

  for (const leagueId of PRO_MATRIX_ANALYTICS_LEAGUE_IDS) {
    const findingLeague = LEAGUE_ID_TO_FINDING[leagueId];
    const dataLeague = LEAGUE_TO_DATA[findingLeague];
    const stats = getCachedRefStats(leagueId);
    const logs = getCachedGameLogs(dataLeague);

    if (!stats?.refs?.length || !logs?.games?.length) continue;

    const leagueFindings = computeGeoCorrelationsForLeague(
      findingLeague,
      stats,
      logs.games,
    );
    all.push(...leagueFindings);
    releaseParsedPayload(leagueFindings);
  }

  return all.sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp));
}

/** Exported for tests and Research page filters. */
export function isTopGeoFinding(finding: GeoCorrelationFinding): boolean {
  return (
    finding.highConfidence &&
    finding.regionalGames >= MIN_REGIONAL_GAMES &&
    Math.abs(finding.deltaPp) >= MIN_SIGNAL_DELTA * 100
  );
}

// ── International / World Cup origin variance (client-safe re-exports) ─────

export {
  ORIGIN_VARIANCE_OUTLIER_MIN,
  FIFA_CONFEDERATION_BY_NATION,
  normalizeNationToken,
  inferCountryFromBirthplace,
  nationConfederation,
  nationalOriginDistance,
  computeMatchupOriginVariance,
  type TeamNationResolver,
  computeRefOriginVariance,
  enrichRefWithOriginVariance,
  isOriginVarianceOutlier,
  computeOriginVarianceMean,
} from "@/lib/geo-origin-variance";
