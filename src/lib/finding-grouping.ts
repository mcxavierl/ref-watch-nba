import type { Finding, FindingCategory, FindingStat } from "@/lib/findings-shared";
import {
  filterDisplayStats,
  findingConfidenceTier,
  sortFindingsByStrength,
} from "@/lib/findings-shared";
import type { ConfidenceTier } from "@/lib/user-language";

const REF_PROFILE_LINK_RE = /\/refs\/([^/]+)\/?$/;

export type OfficialIdentity = {
  key: string;
  name: string;
  profileHref: string;
};

export type OfficialFindingsGroup = {
  kind: "official";
  official: OfficialIdentity;
  findings: Finding[];
};

export type StandaloneFindingItem = {
  kind: "standalone";
  finding: Finding;
};

export type FindingsFeedItem = OfficialFindingsGroup | StandaloneFindingItem;

function normalizeStatLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Drop duplicate metric cells (same label + value) inside a view block. */
export function dedupeFindingStats(stats: FindingStat[]): FindingStat[] {
  const display = filterDisplayStats(stats);
  const seen = new Set<string>();
  const unique: FindingStat[] = [];

  for (const stat of display) {
    const key = `${normalizeStatLabel(stat.label)}|${stat.value.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(stat);
  }

  return unique;
}

/** Collect unique substantive metrics across angles without repeating labels. */
export function mergeGroupPreviewStats(findings: Finding[]): FindingStat[] {
  const merged: FindingStat[] = [];
  const seenLabels = new Set<string>();

  for (const finding of findings) {
    for (const stat of dedupeFindingStats(finding.stats)) {
      const labelKey = normalizeStatLabel(stat.label);
      if (seenLabels.has(labelKey)) continue;
      seenLabels.add(labelKey);
      merged.push(stat);
      if (merged.length >= 3) return merged;
    }
  }

  return merged;
}

function statKey(stat: FindingStat): string {
  return `${normalizeStatLabel(stat.label)}|${stat.value.trim()}`;
}

/**
 * Per-angle metrics with prior-angle duplicates removed (label + value).
 * Header preview stats may repeat in angle 0; later angles only add new cells.
 */
export function statsForAngleBlock(
  finding: Finding,
  findings: Finding[],
  angleIndex: number,
): FindingStat[] {
  const used = new Set<string>();

  for (let i = 0; i < angleIndex; i++) {
    const priorFinding = findings[i];
    if (!priorFinding) continue;
    for (const stat of dedupeFindingStats(priorFinding.stats)) {
      used.add(statKey(stat));
    }
  }

  return dedupeFindingStats(finding.stats).filter(
    (stat) => !used.has(statKey(stat)),
  );
}

function cleanOfficialLabel(label: string): string {
  return label.replace(/\s+profile$/i, "").trim();
}

/** Resolve a single official from profile links when the finding is ref-scoped. */
export function extractOfficialFromFinding(
  finding: Finding,
): OfficialIdentity | null {
  const refLinks = finding.links
    .map((link) => {
      const match = link.href.match(REF_PROFILE_LINK_RE);
      if (!match) return null;
      return {
        key: match[1],
        name: cleanOfficialLabel(link.label),
        profileHref: link.href,
      };
    })
    .filter((entry): entry is OfficialIdentity => entry !== null);

  if (refLinks.length === 1) {
    return refLinks[0];
  }

  if (refLinks.length > 1) {
    return null;
  }

  if (finding.category === "league-trend" || finding.category === "team-crew") {
    return null;
  }

  const headlineMatch = finding.headline.match(
    /^([A-Z][A-Za-z.' -]+?)(?:'s|\s+runs|\s+whistles|\s+helps|\s+pushes|:)/,
  );
  if (!headlineMatch) return null;

  const name = headlineMatch[1].trim();
  if (name.length < 4) return null;

  return {
    key: `headline:${name.toLowerCase()}`,
    name,
    profileHref: finding.links[0]?.href ?? "#",
  };
}

/** Strip redundant official name prefix from angle headlines inside a grouped card. */
export function angleHeadline(finding: Finding, officialName: string): string {
  const name = officialName.trim();
  if (!name) return finding.headline;

  if (finding.headline.startsWith(name)) {
    const rest = finding.headline
      .slice(name.length)
      .replace(/^[':]?\s*/, "")
      .trim();
    if (rest.length >= 12) {
      return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
  }

  const withPattern = finding.headline.match(
    new RegExp(`\\bwith\\s+${escapeRegExp(name)}[.?!]?$`, "i"),
  );
  if (withPattern) {
    const rest = finding.headline
      .slice(0, withPattern.index)
      .replace(/\s+with\s*$/i, "")
      .trim();
    if (rest.length >= 12) return rest;
  }

  return finding.headline;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Group ref-scoped findings into one card per official; leave league/team patterns standalone. */
export function groupFindingsForFeed<T extends Finding>(
  findings: T[],
): Array<
  | { kind: "official"; official: OfficialIdentity; findings: T[] }
  | { kind: "standalone"; finding: T }
> {
  const sorted = sortFindingsByStrength(findings);
  const buckets = new Map<string, { official: OfficialIdentity; findings: T[] }>();
  const result: Array<
    | { kind: "official"; official: OfficialIdentity; findings: T[] }
    | { kind: "standalone"; finding: T }
  > = [];
  const emittedOfficial = new Set<string>();
  const emittedStandalone = new Set<string>();

  for (const finding of sorted) {
    const official = extractOfficialFromFinding(finding);
    if (!official) {
      if (emittedStandalone.has(finding.id)) continue;
      result.push({ kind: "standalone", finding });
      emittedStandalone.add(finding.id);
      continue;
    }

    const bucket = buckets.get(official.key);
    if (bucket) {
      bucket.findings.push(finding);
    } else {
      buckets.set(official.key, { official, findings: [finding] });
    }

    if (emittedOfficial.has(official.key)) continue;
    result.push({
      kind: "official",
      official,
      findings: buckets.get(official.key)!.findings,
    });
    emittedOfficial.add(official.key);
  }

  return result.map((item) =>
    item.kind === "official"
      ? {
          ...item,
          findings: sortFindingsByStrength(item.findings),
        }
      : item,
  );
}

export function uniqueFindingCategories(
  findings: Finding[],
): FindingCategory[] {
  const categories: FindingCategory[] = [];
  const seen = new Set<FindingCategory>();
  for (const finding of findings) {
    if (seen.has(finding.category)) continue;
    seen.add(finding.category);
    categories.push(finding.category);
  }
  return categories;
}

export function strongestConfidenceTier(findings: Finding[]): ConfidenceTier {
  const sorted = sortFindingsByStrength(findings);
  return findingConfidenceTier(sorted[0]);
}

export function syntheticSampleNote(findings: Finding[]): string {
  const sorted = sortFindingsByStrength(findings);
  return sorted[0]?.sampleNote ?? "";
}

/** Count grouped feed cards (one per official + standalone items). */
export function countFeedCards(
  feed: Array<
    | { kind: "official"; findings: Finding[] }
    | { kind: "standalone"; finding: Finding }
  >,
): number {
  return feed.length;
}
