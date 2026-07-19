import { extractOfficialFromFinding } from "@/lib/finding-grouping";
import {
  findingConfidenceTier,
  inferFindingLeague,
  type Finding,
  type FindingLeague,
} from "@/lib/findings-shared";
import {
  BETTING_EDGE_MIN_PTS,
  CROSS_TEAM_WHISTLE_MIN_SPREAD,
  MATRIX_HEADLINE_MIN_DELTA_PTS,
} from "@/lib/findings-significance";
import { resolveRefBirthplace } from "@/lib/ref-geography";
import { NBA_TEAMS } from "@/lib/teams";
import { NFL_TEAMS } from "@/lib/nfl/teams";
import { NHL_TEAMS } from "@/lib/nhl/teams";
import { EPL_TEAMS } from "@/lib/epl/teams";
import { LALIGA_TEAMS } from "@/lib/laliga/teams";
import { CBB_TEAMS } from "@/lib/cbb/teams";
import { CFB_TEAMS } from "@/lib/cfb/teams";
import type { RefStatsFile } from "@/lib/types";

const REF_PROFILE_LINK_RE = /\/refs\/([^/]+)\/?$/;
const TEAM_LINK_RE = /\/teams\/([^/]+)\/?$/;

const CITY_ALIASES: Record<string, string[]> = {
  "los angeles": ["la", "los angeles", "l.a."],
  "new york": ["new york", "brooklyn", "ny"],
  "golden state": ["san francisco", "oakland", "golden state"],
  indiana: ["indianapolis", "indiana"],
  carolina: ["charlotte", "carolina"],
  tampa: ["tampa bay", "tampa"],
};

type TeamGeo = { abbr: string; city: string; division?: string };

const TEAMS_BY_LEAGUE: Record<FindingLeague, TeamGeo[]> = {
  NBA: NBA_TEAMS,
  NFL: NFL_TEAMS,
  NHL: NHL_TEAMS,
  EPL: EPL_TEAMS,
  LALIGA: LALIGA_TEAMS,
  CBB: CBB_TEAMS,
  CFB: CFB_TEAMS,
  WNBA: [],
};

function normalizeGeoToken(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "");
}

function parseBirthplace(value: string): { city: string; region: string } | null {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
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

function citiesCorrelate(birthplace: string, teamCity: string): boolean {
  const parsed = parseBirthplace(birthplace);
  const birthCity = parsed?.city ?? birthplace;
  const birthTokens = cityTokens(birthCity);
  const teamTokens = cityTokens(teamCity);

  return birthTokens.some((birth) =>
    teamTokens.some(
      (team) => team.includes(birth) || birth.includes(team),
    ),
  );
}

function parseStatMagnitude(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? null : Math.abs(n);
}

/** Strong tier maps to user-facing "High" confidence. */
export function isHighConfidenceFinding(finding: Finding): boolean {
  return findingConfidenceTier(finding) === "Strong";
}

/** True when the finding carries an extreme delta relative to its category. */
export function findingHasExtremeDelta(finding: Finding): boolean {
  if (
    finding.category === "ref-team-split" ||
    finding.id.includes("matrix")
  ) {
    const deltaStat = finding.stats.find((stat) =>
      stat.label.toLowerCase().includes("delta"),
    );
    const magnitude = deltaStat ? parseStatMagnitude(deltaStat.value) : null;
    return magnitude !== null && magnitude >= MATRIX_HEADLINE_MIN_DELTA_PTS;
  }

  if (finding.category === "ats-edge" || finding.category === "ou-edge") {
    const edgeStat = finding.stats.find((stat) =>
      stat.label.toLowerCase().includes("edge"),
    );
    const magnitude = edgeStat ? parseStatMagnitude(edgeStat.value) : null;
    return (
      magnitude !== null && magnitude >= BETTING_EDGE_MIN_PTS * 100
    );
  }

  if (finding.category === "whistle-extreme" || finding.id.includes("whistle")) {
    const swingStat = finding.stats.find((stat) => stat.label === "Whistle swing");
    if (swingStat) {
      const magnitude = parseStatMagnitude(swingStat.value);
      return (
        magnitude !== null && magnitude >= CROSS_TEAM_WHISTLE_MIN_SPREAD
      );
    }
    const scoringDelta = finding.stats.find((stat) =>
      /scoring delta/i.test(stat.label),
    );
    const magnitude = scoringDelta
      ? parseStatMagnitude(scoringDelta.value)
      : null;
    return magnitude !== null && magnitude >= 1.5;
  }

  if (
    finding.category === "ref-outlier" ||
    finding.category === "scoring-extreme"
  ) {
    const scoringDelta = finding.stats.find((stat) =>
      /scoring delta/i.test(stat.label),
    );
    if (scoringDelta) {
      const magnitude = parseStatMagnitude(scoringDelta.value);
      return magnitude !== null && magnitude >= 3.5;
    }
    const rateDelta = finding.stats.find((stat) =>
      /delta vs 50/i.test(stat.label),
    );
    const magnitude = rateDelta ? parseStatMagnitude(rateDelta.value) : null;
    return magnitude !== null && magnitude >= 10;
  }

  const deltaStat = finding.stats.find((stat) =>
    /delta|swing|edge/i.test(stat.label),
  );
  const magnitude = deltaStat ? parseStatMagnitude(deltaStat.value) : null;
  return magnitude !== null && magnitude >= MATRIX_HEADLINE_MIN_DELTA_PTS;
}

export function extractTeamAbbrFromFinding(finding: Finding): string | null {
  for (const link of finding.links) {
    const match = link.href.match(TEAM_LINK_RE);
    if (match) return match[1]!.toUpperCase();
  }
  return null;
}

function lookupTeam(league: FindingLeague, abbr: string): TeamGeo | undefined {
  return TEAMS_BY_LEAGUE[league].find(
    (team) => team.abbr.toUpperCase() === abbr.toUpperCase(),
  );
}

function matchupRegionLabel(
  league: FindingLeague,
  teamAbbr: string,
  finding: Finding,
): string {
  const team = lookupTeam(league, teamAbbr);
  if (team?.division) {
    return `${team.division} Division matchups`;
  }
  const teamLink = finding.links.find((link) =>
    TEAM_LINK_RE.test(link.href),
  );
  if (teamLink) {
    return `${teamLink.label} matchups`;
  }
  return "regional matchups";
}

export function birthplaceCorrelatesWithFinding(
  birthplace: string,
  finding: Finding,
  league: FindingLeague,
): { regionLabel: string } | null {
  const teamAbbr = extractTeamAbbrFromFinding(finding);
  if (!teamAbbr) return null;

  const team = lookupTeam(league, teamAbbr);
  if (!team) return null;

  if (!citiesCorrelate(birthplace, team.city)) return null;

  return {
    regionLabel: matchupRegionLabel(league, teamAbbr, finding),
  };
}

export function formatRegionalContextCopy(
  birthplace: string,
  regionLabel: string,
): string {
  return `Official is a native of ${birthplace}, matching a long-term career variance in ${regionLabel}.`;
}

export function resolveRegionalContextForFinding(
  finding: Finding,
  stats: RefStatsFile,
): string | undefined {
  if (!isHighConfidenceFinding(finding)) return undefined;
  if (!findingHasExtremeDelta(finding)) return undefined;

  const official =
    extractOfficialFromFinding(finding) ??
    (() => {
      const refLink = finding.links.find((link) =>
        REF_PROFILE_LINK_RE.test(link.href),
      );
      if (!refLink) return null;
      const slug = refLink.href.match(REF_PROFILE_LINK_RE)?.[1];
      if (!slug) return null;
      return { key: slug, name: refLink.label, profileHref: refLink.href };
    })();

  if (!official) return undefined;

  const league = inferFindingLeague(finding);
  const birthplace = resolveRefBirthplace(official.key, stats, league);
  if (!birthplace) return undefined;

  const correlation = birthplaceCorrelatesWithFinding(
    birthplace,
    finding,
    league,
  );
  if (!correlation) return undefined;

  return formatRegionalContextCopy(birthplace, correlation.regionLabel);
}

export function attachRegionalContextToFindings(
  findings: Finding[],
  stats: RefStatsFile,
): Finding[] {
  return findings.map((finding) => {
    const regionalContext = resolveRegionalContextForFinding(finding, stats);
    if (!regionalContext) return finding;
    return { ...finding, regionalContext };
  });
}
