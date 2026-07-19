import type { Finding, FindingStat } from "@/lib/findings-shared";

export type SuperBowlInsightCardModel = {
  id: string;
  primaryStatTitle: string;
  bigNumber: string;
  variancePill: string | null;
  officialName: string;
  gameContext: string;
  profileHref: string | null;
};

function parseBaseline(detail: string | undefined): number | null {
  if (!detail) return null;
  const match = detail.match(/vs\s+([\d.]+)/i);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]!);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSignedDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded > 0) return `+${rounded} vs avg`;
  if (rounded < 0) return `${rounded} vs avg`;
  return "At avg";
}

export function formatSuperBowlVariancePill(stat: FindingStat | undefined): string | null {
  if (!stat?.detail) return null;

  const numericValue = Number.parseFloat(stat.value.replace(/[^\d.-]/g, ""));
  const baseline = parseBaseline(stat.detail);
  if (Number.isFinite(numericValue) && baseline !== null) {
    return formatSignedDelta(numericValue - baseline);
  }

  if (/^vs\s/i.test(stat.detail)) {
    return stat.detail.replace(/reg-season avg/i, "avg").replace(/^vs\s/i, "");
  }

  return stat.detail;
}

function refereeStat(stats: FindingStat[]): FindingStat | undefined {
  return stats.find((stat) => stat.label.toLowerCase() === "referee");
}

function gameContextFromFinding(finding: Finding, stats: FindingStat[]): string {
  const refStat = refereeStat(stats);
  if (refStat?.detail) {
    const roman = refStat.detail.replace(/^SB\s/i, "").trim();
    return `Refereed Super Bowl ${roman}`;
  }

  const sbDetail = stats.find((stat) => /SB\s/i.test(stat.detail ?? ""))?.detail;
  if (sbDetail) {
    const roman = sbDetail.replace(/^SB\s/i, "").trim();
    return `Super Bowl ${roman}`;
  }

  const sbMatch = finding.sampleNote.match(/Super Bowl[s]?\s*\(([^)]+)\)/i);
  if (sbMatch) return `Sample: ${sbMatch[1]}`;

  return finding.summary.split(".")[0] ?? finding.summary;
}

export function superBowlFindingCardModel(finding: Finding): SuperBowlInsightCardModel {
  const stats = finding.stats ?? [];
  const primary = stats[0];
  const refStat = refereeStat(stats);
  const profileLink = finding.links.find((link) => /\/refs\//.test(link.href));

  return {
    id: finding.id,
    primaryStatTitle: primary?.label ?? "Metric",
    bigNumber: primary?.value ?? "-",
    variancePill: formatSuperBowlVariancePill(primary),
    officialName: refStat?.value ?? profileLink?.label ?? "NFL official",
    gameContext: gameContextFromFinding(finding, stats),
    profileHref: profileLink?.href ?? null,
  };
}
