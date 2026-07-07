import { formatSigned } from "@/lib/data";
import type { GrudgeStoryline } from "@/lib/grudge-match";
import type { Finding } from "@/lib/findings-shared";
import {
  benchmarkLabel,
  confidenceTier,
  formatSampleCount,
  sportCopy,
  type ConfidenceTier,
  type Sport,
} from "@/lib/user-language";
import type {
  CrewHomeBias,
  CrewWhistlePremium,
  NhlOtRateSignal,
  NhlPpPremiumSignal,
} from "@/lib/types";

export interface EdgeSummaryItem {
  id: string;
  matchup: string;
  edge: string;
  sample: string;
  confidence: ConfidenceTier;
  href: string;
}

function gameAnchor(gameId: string): string {
  return `#game-${gameId}`;
}

function pushUnique(
  items: EdgeSummaryItem[],
  item: EdgeSummaryItem,
  seen: Set<string>,
) {
  if (seen.has(item.id)) return;
  seen.add(item.id);
  items.push(item);
}

function premiumEdge(
  premium: CrewWhistlePremium,
  sport: Sport,
): EdgeSummaryItem {
  const copy = sportCopy(sport);
  const unit = copy.scoringUnit;
  const tier = confidenceTier(
    premium.sampleQuality,
    undefined,
    premium.provenance?.sampleGate.cleared,
  );
  const sampleGames = premium.provenance?.sampleGate.sampleSize ?? 0;

  return {
    id: `premium-${premium.gameId}`,
    matchup: premium.matchup,
    edge: `Crew historically adds ${formatSigned(premium.scoringPremium)} ${unit} above average`,
    sample: sampleGames > 0 ? formatSampleCount(sampleGames) : `${premium.avgTotalPoints} avg`,
    confidence: tier,
    href: gameAnchor(premium.gameId),
  };
}

function homeBiasEdge(bias: CrewHomeBias): EdgeSummaryItem {
  return {
    id: `home-bias-${bias.gameId}`,
    matchup: bias.headline.split(",")[0]?.trim() ?? bias.headline,
    edge: bias.summary,
    sample: formatSampleCount(bias.sampleGames),
    confidence: confidenceTier(
      undefined,
      bias.sampleGames,
      bias.provenance?.sampleGate.cleared,
    ),
    href: gameAnchor(bias.gameId),
  };
}

function grudgeEdge(story: GrudgeStoryline): EdgeSummaryItem {
  const href = story.links[0]?.href ?? gameAnchor(story.gameId);
  return {
    id: `grudge-${story.id}`,
    matchup: story.headline,
    edge: story.summary,
    sample: story.sampleNote.replace(/^Based on /i, "").replace(/\.$/, ""),
    confidence: confidenceTier(undefined, undefined, true),
    href,
  };
}

function ppPremiumEdge(signal: NhlPpPremiumSignal): EdgeSummaryItem {
  return {
    id: `pp-${signal.gameId}`,
    matchup: signal.matchup,
    edge: signal.summary,
    sample: signal.provenance
      ? formatSampleCount(signal.provenance.sampleGate.sampleSize)
      : "Special teams index",
    confidence: confidenceTier(
      undefined,
      signal.provenance?.sampleGate.sampleSize,
      signal.provenance?.sampleGate.cleared,
    ),
    href: gameAnchor(signal.gameId),
  };
}

function otSignalEdge(signal: NhlOtRateSignal): EdgeSummaryItem {
  return {
    id: `ot-${signal.gameId}`,
    matchup: signal.matchup,
    edge: signal.summary,
    sample: signal.provenance
      ? formatSampleCount(signal.provenance.sampleGate.sampleSize)
      : `${(signal.refereeOtRate * 100).toFixed(0)}% OT rate`,
    confidence: confidenceTier(
      undefined,
      signal.provenance?.sampleGate.sampleSize,
      signal.provenance?.sampleGate.cleared,
    ),
    href: gameAnchor(signal.gameId),
  };
}

function gapEdge(premium: CrewWhistlePremium, sport: Sport): EdgeSummaryItem {
  const copy = sportCopy(sport);
  const bench = benchmarkLabel(
    premium.benchmarkSource,
    premium.benchmarkTotal,
  );
  return {
    id: `gap-${premium.gameId}`,
    matchup: premium.matchup,
    edge: `${formatSigned(premium.gapVsBenchmark)} ${copy.scoringUnit} vs ${bench} on average`,
    sample: formatSampleCount(
      premium.provenance?.sampleGate.sampleSize ?? premium.qualifiedRefCount * 20,
    ),
    confidence: confidenceTier(premium.sampleQuality),
    href: gameAnchor(premium.gameId),
  };
}

export function buildTonightEdgeSummary(input: {
  sport: Sport;
  alertPremiums: CrewWhistlePremium[];
  allPremiums?: CrewWhistlePremium[];
  homeBiasSignals?: CrewHomeBias[];
  storylines?: GrudgeStoryline[];
  ppPremiums?: NhlPpPremiumSignal[];
  otSignals?: NhlOtRateSignal[];
  limit?: number;
}): EdgeSummaryItem[] {
  const {
    sport,
    alertPremiums,
    allPremiums = alertPremiums,
    homeBiasSignals = [],
    storylines = [],
    ppPremiums = [],
    otSignals = [],
    limit = 5,
  } = input;

  const items: EdgeSummaryItem[] = [];
  const seen = new Set<string>();

  for (const p of alertPremiums) {
    pushUnique(items, premiumEdge(p, sport), seen);
  }

  for (const s of storylines.slice(0, 2)) {
    pushUnique(items, grudgeEdge(s), seen);
  }

  for (const b of homeBiasSignals.slice(0, 2)) {
    pushUnique(items, homeBiasEdge(b), seen);
  }

  for (const p of ppPremiums.slice(0, 2)) {
    pushUnique(items, ppPremiumEdge(p), seen);
  }

  for (const o of otSignals.slice(0, 2)) {
    pushUnique(items, otSignalEdge(o), seen);
  }

  if (items.length < limit) {
    const extras = allPremiums
      .filter((p) => Math.abs(p.gapVsBenchmark) >= 2)
      .sort(
        (a, b) =>
          Math.abs(b.gapVsBenchmark) - Math.abs(a.gapVsBenchmark),
      );
    for (const p of extras) {
      if (items.length >= limit) break;
      pushUnique(items, gapEdge(p, sport), seen);
    }
  }

  return items.slice(0, limit);
}

export function buildOffseasonEdgeSummary(
  findings: Finding[],
  limit = 5,
): EdgeSummaryItem[] {
  return findings.slice(0, limit).map((f) => ({
    id: `finding-${f.id}`,
    matchup: f.headline,
    edge: f.summary,
    sample: f.sampleNote.replace(/^Based on /i, "").replace(/\.$/, ""),
    confidence: "Moderate" as ConfidenceTier,
    href: f.links[0]?.href ?? "#dataset-findings",
  }));
}
