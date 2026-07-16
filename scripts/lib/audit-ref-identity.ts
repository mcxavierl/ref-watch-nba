/**
 * Ref identity audit: fail CI when production ref-stats contain split profiles
 * (same canonicalRefKey) or reverse-name ghosts (First Last ↔ Last First, #0).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefProfile, RefStatsFile } from "../../src/lib/types";
import { canonicalRefKey, findReverseNameGhosts } from "./ref-identity";

export const REF_STATS_AUDIT_PATHS: { league: string; path: string }[] = [
  { league: "nba", path: "data/ref-stats.json" },
  { league: "nhl", path: "data/nhl/ref-stats.json" },
  { league: "nfl", path: "data/nfl/ref-stats.json" },
  { league: "epl", path: "data/epl/ref-stats.json" },
  { league: "cbb", path: "data/cbb/ref-stats.json" },
  { league: "cfb", path: "data/cfb/ref-stats.json" },
  { league: "laliga", path: "data/laliga/ref-stats.json" },
];

export interface RefProfileSummary {
  name: string;
  slug: string;
  number: number;
  games: number;
}

export interface DuplicateCanonicalKeyFinding {
  type: "duplicate-canonical-key";
  league: string;
  canonicalKey: string;
  profiles: RefProfileSummary[];
}

export interface ReverseNameGhostFinding {
  type: "reverse-name-ghost";
  league: string;
  ghostName: string;
  ghostSlug: string;
  canonName: string;
  canonSlug: string;
}

export type RefIdentityFinding =
  | DuplicateCanonicalKeyFinding
  | ReverseNameGhostFinding;

/** Group refs sharing a canonicalRefKey (split profiles). */
export function findDuplicateCanonicalKeys(
  refs: RefProfile[],
): Omit<DuplicateCanonicalKeyFinding, "league">[] {
  const groups = new Map<string, RefProfile[]>();
  for (const ref of refs) {
    const key = canonicalRefKey(ref.name);
    const list = groups.get(key) ?? [];
    list.push(ref);
    groups.set(key, list);
  }

  const findings: Omit<DuplicateCanonicalKeyFinding, "league">[] = [];
  for (const [canonicalKey, profiles] of groups) {
    if (profiles.length <= 1) continue;
    findings.push({
      type: "duplicate-canonical-key",
      canonicalKey,
      profiles: profiles.map((p) => ({
        name: p.name,
        slug: p.slug,
        number: p.number,
        games: p.games,
      })),
    });
  }
  return findings;
}

/** Audit one league's ref list for duplicate keys and reverse-name ghosts. */
export function auditRefStatsRefs(
  league: string,
  refs: RefProfile[],
): RefIdentityFinding[] {
  const duplicates = findDuplicateCanonicalKeys(refs).map((f) => ({
    ...f,
    league,
  }));
  const ghosts = findReverseNameGhosts(refs).map(
    (g): ReverseNameGhostFinding => ({
      type: "reverse-name-ghost",
      league,
      ghostName: g.ghostName,
      ghostSlug: g.ghostSlug,
      canonName: g.canonName,
      canonSlug: g.canonSlug,
    }),
  );
  return [...duplicates, ...ghosts];
}

function formatFinding(finding: RefIdentityFinding): string {
  if (finding.type === "duplicate-canonical-key") {
    const profiles = finding.profiles
      .map((p) => `${p.name} (#${p.number}, ${p.games}g, ${p.slug})`)
      .join("; ");
    return `${finding.league}: duplicate canonical key "${finding.canonicalKey}" - ${profiles}`;
  }
  return (
    `${finding.league} reverse-name ghost: ${finding.ghostName} (${finding.ghostSlug}) ` +
    `↔ ${finding.canonName} (${finding.canonSlug})`
  );
}

/** Scan committed ref-stats files; returns human-readable failure messages. */
export function auditRefIdentity(root?: string): {
  failures: string[];
  findings: RefIdentityFinding[];
} {
  const r = root ?? process.cwd();
  const failures: string[] = [];
  const findings: RefIdentityFinding[] = [];

  for (const { league, path: rel } of REF_STATS_AUDIT_PATHS) {
    const full = path.join(r, rel);
    if (!fs.existsSync(full)) continue;

    const stats = JSON.parse(fs.readFileSync(full, "utf8")) as RefStatsFile;
    const leagueFindings = auditRefStatsRefs(league, stats.refs);
    findings.push(...leagueFindings);
    for (const finding of leagueFindings) {
      failures.push(formatFinding(finding));
    }
  }

  return { failures, findings };
}
