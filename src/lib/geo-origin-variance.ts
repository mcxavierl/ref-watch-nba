import type { RefProfile } from "@/lib/types";

// ── International / World Cup origin variance ───────────────────────────────

/** Minimum mean origin variance to flag an official as a geopolitical outlier. */
export const ORIGIN_VARIANCE_OUTLIER_MIN = 0.65;

/** FIFA confederation keys for national distance scoring. */
export const FIFA_CONFEDERATION_BY_NATION: Record<string, string> = {
  USA: "concacaf",
  MEX: "concacaf",
  CAN: "concacaf",
  CRC: "concacaf",
  JAM: "concacaf",
  ENG: "uefa",
  GBR: "uefa",
  SCO: "uefa",
  WAL: "uefa",
  NIR: "uefa",
  ESP: "uefa",
  FRA: "uefa",
  GER: "uefa",
  ITA: "uefa",
  NED: "uefa",
  POR: "uefa",
  BEL: "uefa",
  SUI: "uefa",
  POL: "uefa",
  CRO: "uefa",
  SRB: "uefa",
  UKR: "uefa",
  SWE: "uefa",
  NOR: "uefa",
  DEN: "uefa",
  AUT: "uefa",
  CZE: "uefa",
  HUN: "uefa",
  ROU: "uefa",
  TUR: "uefa",
  GRE: "uefa",
  BRA: "conmebol",
  ARG: "conmebol",
  URU: "conmebol",
  CHI: "conmebol",
  COL: "conmebol",
  ECU: "conmebol",
  PER: "conmebol",
  PAR: "conmebol",
  JPN: "afc",
  KOR: "afc",
  AUS: "afc",
  IRN: "afc",
  KSA: "afc",
  QAT: "afc",
  CHN: "afc",
  MAR: "caf",
  SEN: "caf",
  NGA: "caf",
  GHA: "caf",
  CIV: "caf",
  CM: "caf",
  TUN: "caf",
  EGY: "caf",
  RSA: "caf",
  NZL: "ofc",
};

const US_STATE_TOKENS = new Set([
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
  "maine", "maryland", "massachusetts", "michigan", "minnesota",
  "mississippi", "missouri", "montana", "nebraska", "nevada",
  "new hampshire", "new jersey", "new mexico", "new york",
  "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
  "pennsylvania", "rhode island", "south carolina", "south dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington",
  "west virginia", "wisconsin", "wyoming",
]);

const US_STATE_ABBRS = new Set([
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id",
  "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms",
  "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok",
  "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv",
  "wi", "wy", "dc",
]);

const BIRTHPLACE_COUNTRY_ALIASES: Record<string, string> = {
  usa: "USA",
  "united states": "USA",
  "united states of america": "USA",
  us: "USA",
  "u.s.": "USA",
  america: "USA",
  england: "ENG",
  uk: "GBR",
  "united kingdom": "GBR",
  scotland: "SCO",
  wales: "WAL",
  spain: "ESP",
  españa: "ESP",
  france: "FRA",
  germany: "GER",
  italy: "ITA",
  mexico: "MEX",
  méxico: "MEX",
  canada: "CAN",
  brazil: "BRA",
  brasil: "BRA",
  argentina: "ARG",
  netherlands: "NED",
  portugal: "PRT",
  belgium: "BEL",
  switzerland: "SUI",
  sweden: "SWE",
  norway: "NOR",
  denmark: "DEN",
  poland: "POL",
  croatia: "CRO",
  serbia: "SRB",
  ukraine: "UKR",
  japan: "JPN",
  "south korea": "KOR",
  korea: "KOR",
  australia: "AUS",
  morocco: "MAR",
  senegal: "SEN",
  nigeria: "NGA",
};

export function normalizeNationToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (FIFA_CONFEDERATION_BY_NATION[upper]) return upper;
  const lower = trimmed.toLowerCase();
  return BIRTHPLACE_COUNTRY_ALIASES[lower] ?? upper;
}

/** Infer birth nation from a birthplace or hometown string. */
export function inferCountryFromBirthplace(value: string | undefined | null): string | null {
  if (!value?.trim()) return null;
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const last = parts[parts.length - 1]!.toLowerCase();
  const lastNorm = normalizeNationToken(parts[parts.length - 1]!);
  if (FIFA_CONFEDERATION_BY_NATION[lastNorm]) return lastNorm;
  if (BIRTHPLACE_COUNTRY_ALIASES[last]) return BIRTHPLACE_COUNTRY_ALIASES[last]!;
  if (US_STATE_TOKENS.has(last) || US_STATE_ABBRS.has(last)) return "USA";

  for (let i = parts.length - 1; i >= 0; i--) {
    const token = parts[i]!;
    const nation = normalizeNationToken(token);
    if (FIFA_CONFEDERATION_BY_NATION[nation]) return nation;
    const lower = token.toLowerCase();
    if (BIRTHPLACE_COUNTRY_ALIASES[lower]) return BIRTHPLACE_COUNTRY_ALIASES[lower]!;
  }

  return null;
}

/** Resolve FIFA confederation from nation code. */
export function nationConfederation(nation: string): string | null {
  const norm = normalizeNationToken(nation);
  return FIFA_CONFEDERATION_BY_NATION[norm] ?? null;
}

/**
 * Statistical distance between two nations (0 = same, 0.5 = same confederation, 1 = different).
 */
export function nationalOriginDistance(a: string, b: string): number {
  const na = normalizeNationToken(a);
  const nb = normalizeNationToken(b);
  if (!na || !nb) return 1;
  if (na === nb) return 0;

  const confA = nationConfederation(na);
  const confB = nationConfederation(nb);
  if (confA && confB && confA === confB) return 0.5;
  return 1;
}

/**
 * Officiating Origin Variance for a single matchup — mean distance from referee
 * birth nation to each participating team's nation.
 */
export function computeMatchupOriginVariance(
  refNation: string,
  homeNation: string,
  awayNation: string,
): number {
  const homeDist = nationalOriginDistance(refNation, homeNation);
  const awayDist = nationalOriginDistance(refNation, awayNation);
  return (homeDist + awayDist) / 2;
}

export type TeamNationResolver = (teamAbbr: string) => string | null;

/**
 * Weighted mean origin variance across a referee's team-level game samples.
 * Returns null when birth nation or team mapping is unavailable.
 */
export function computeRefOriginVariance(
  ref: Pick<RefProfile, "birthCountry" | "birthplace" | "hometown" | "teamStats">,
  resolveTeamNation: TeamNationResolver,
): number | null {
  const refNation =
    ref.birthCountry?.trim() ||
    inferCountryFromBirthplace(ref.birthplace) ||
    inferCountryFromBirthplace(ref.hometown);
  if (!refNation || !ref.teamStats) return null;

  let weightedSum = 0;
  let totalGames = 0;

  for (const [abbr, stat] of Object.entries(ref.teamStats)) {
    const teamNation = resolveTeamNation(abbr);
    if (!teamNation || stat.games <= 0) continue;
    const distance = nationalOriginDistance(refNation, teamNation);
    weightedSum += distance * stat.games;
    totalGames += stat.games;
  }

  if (totalGames === 0) return null;
  return weightedSum / totalGames;
}

export function enrichRefWithOriginVariance(
  ref: RefProfile,
  resolveTeamNation: TeamNationResolver,
): RefProfile {
  const originVariance = computeRefOriginVariance(ref, resolveTeamNation);
  if (originVariance === null) return ref;
  return { ...ref, originVariance };
}

export function isOriginVarianceOutlier(
  ref: Pick<RefProfile, "originVariance">,
  threshold = ORIGIN_VARIANCE_OUTLIER_MIN,
): boolean {
  return typeof ref.originVariance === "number" && ref.originVariance >= threshold;
}

export function computeOriginVarianceMean(
  refs: Pick<RefProfile, "originVariance">[],
): number {
  const values = refs
    .map((ref) => ref.originVariance)
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
