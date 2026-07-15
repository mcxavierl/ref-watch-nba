import { CFB_TEAMS, type CfbTeam } from "../../../src/lib/cfb/teams";

export type CfbConferenceSlug = "sec" | "big-12" | "acc" | "big-ten";

export type CfbConferenceSpec = {
  slug: CfbConferenceSlug;
  label: CfbTeam["conference"];
  /** Expected ingested game count for ±10% volume gate (tracked-team subset). */
  expectedGames: number;
  teamAbbrs: readonly string[];
};

const TEAM_ABBRS_BY_LABEL = (label: CfbTeam["conference"]): string[] =>
  CFB_TEAMS.filter((team) => team.conference === label).map((team) => team.abbr);

export const CFB_CONFERENCE_REGISTRY: Record<CfbConferenceSlug, CfbConferenceSpec> = {
  sec: {
    slug: "sec",
    label: "SEC",
    expectedGames: 150,
    teamAbbrs: TEAM_ABBRS_BY_LABEL("SEC"),
  },
  "big-12": {
    slug: "big-12",
    label: "Big 12",
    // Four tracked Big 12 programs × ~12 regular-season games each.
    expectedGames: 48,
    teamAbbrs: TEAM_ABBRS_BY_LABEL("Big 12"),
  },
  acc: {
    slug: "acc",
    label: "ACC",
    expectedGames: 72,
    teamAbbrs: TEAM_ABBRS_BY_LABEL("ACC"),
  },
  "big-ten": {
    slug: "big-ten",
    label: "Big Ten",
    expectedGames: 96,
    teamAbbrs: TEAM_ABBRS_BY_LABEL("Big Ten"),
  },
};

export const CFB_CONFERENCE_SLUGS = Object.keys(
  CFB_CONFERENCE_REGISTRY,
) as CfbConferenceSlug[];

export function normalizeConferenceSlug(raw: string): CfbConferenceSlug | null {
  const slug = raw.trim().toLowerCase().replace(/_/g, "-");
  return slug in CFB_CONFERENCE_REGISTRY ? (slug as CfbConferenceSlug) : null;
}

export function resolveConferenceSpec(slug: string): CfbConferenceSpec {
  const normalized = normalizeConferenceSlug(slug);
  if (!normalized) {
    throw new Error(
      `Unknown conference slug "${slug}". Supported: ${CFB_CONFERENCE_SLUGS.join(", ")}`,
    );
  }
  return CFB_CONFERENCE_REGISTRY[normalized];
}

export function isGameInConference(
  game: { homeTeam: string; awayTeam: string },
  spec: CfbConferenceSpec,
): boolean {
  const tracked = new Set(spec.teamAbbrs.map((abbr) => abbr.toUpperCase()));
  return (
    tracked.has(game.homeTeam.toUpperCase()) ||
    tracked.has(game.awayTeam.toUpperCase())
  );
}

export function volumeWithinTolerance(
  ingested: number,
  expected: number,
  tolerance = 0.1,
): boolean {
  if (expected <= 0) return ingested > 0;
  const low = expected * (1 - tolerance);
  const high = expected * (1 + tolerance);
  return ingested >= low && ingested <= high;
}
