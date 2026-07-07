import {
  formatSigned,
  getAssignments as getNbaAssignments,
  getRefStats as getNbaRefStats,
} from "@/lib/data";
import { computeSlateStorylines, resolveSlateGames, type GrudgeStoryline } from "@/lib/grudge-match";
import { computeSlateHomeBias } from "@/lib/home-bias";
import { computeSlateOtSignals } from "@/lib/nhl/ot-rate";
import { computeSlatePpPremiums } from "@/lib/nhl/pp-premium";
import {
  getAssignments as getNhlAssignments,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { computeSlateHomeBias as computeNhlSlateHomeBias } from "@/lib/nhl/home-bias";
import { getOdds as getNhlOdds } from "@/lib/nhl/odds";
import {
  computeSlatePremiums as computeNhlSlatePremiums,
  paceAlerts as nhlPaceAlerts,
} from "@/lib/nhl/whistle-premium";
import { getOdds as getNbaOdds } from "@/lib/odds";
import {
  isEstimatedTag,
  provenanceLabel,
  refStatsDataTag,
} from "@/lib/provenance";
import { absoluteUrl, SYNDICATION_DISCLAIMER } from "@/lib/site";
import {
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/whistle-premium";
import type {
  AssignmentsFile,
  CrewHomeBias,
  CrewWhistlePremium,
  NhlOtRateSignal,
  NhlPpPremiumSignal,
  ProvenanceTag,
  RefStatsFile,
  SampleGateStatus,
} from "@/lib/types";

export type SyndicatedSignalKind =
  | "pace_alert"
  | "home_bias"
  | "grudge_match"
  | "pp_premium"
  | "ot_rate";

export interface SyndicatedSignal {
  id: string;
  kind: SyndicatedSignalKind;
  matchup: string;
  headline: string;
  summary: string;
  provenance: ProvenanceTag;
  provenanceLabel: string;
  sampleGate?: SampleGateStatus;
  metrics?: Record<string, number | string | boolean | null>;
}

export interface NightlyFeed {
  generatedAt: string;
  slateDate: string;
  league: "NBA" | "NHL";
  isPreview: boolean;
  assignmentsSource: AssignmentsFile["source"];
  statsSource: RefStatsFile["meta"]["source"];
  pageUrl: string;
  disclaimer: string;
  signals: SyndicatedSignal[];
}

let nbaFeedCache: NightlyFeed | undefined;
let nhlFeedCache: NightlyFeed | undefined;


function signalFromPaceAlert(
  alert: CrewWhistlePremium,
  dataTag: ProvenanceTag,
): SyndicatedSignal | null {
  if (!alert.alert) return null;
  const gate = alert.provenance?.sampleGate;
  if (gate && !gate.cleared) return null;

  const alertTag = alert.provenance?.alert.tag ?? dataTag;
  return {
    id: `pace-${alert.gameId}`,
    kind: "pace_alert",
    matchup: alert.matchup,
    headline:
      alert.alert === "high_pace" ? "High pace crew alert" : "Low pace crew alert",
    summary: `${formatSigned(alert.scoringPremium)} scoring premium · ${formatSigned(alert.gapVsBenchmark)} line gap vs ${alert.benchmarkSource === "sportsbook" ? "book" : "league proxy"}. ${alert.alertReason ?? ""}`.trim(),
    provenance: alertTag,
    provenanceLabel: provenanceLabel(alertTag),
    sampleGate: gate,
    metrics: {
      scoringPremium: alert.scoringPremium,
      gapVsBenchmark: alert.gapVsBenchmark,
      foulPremium: alert.foulPremium,
      sampleQuality: alert.sampleQuality,
    },
  };
}

function signalFromHomeBias(
  bias: CrewHomeBias,
  dataTag: ProvenanceTag,
): SyndicatedSignal | null {
  if (bias.kind === "neutral") return null;
  const gate = bias.provenance?.sampleGate;
  if (gate && !gate.cleared) return null;

  const tag = bias.provenance?.aggregate.tag ?? dataTag;
  return {
    id: `bias-${bias.gameId}`,
    kind: "home_bias",
    matchup: bias.homeLabel,
    headline: bias.headline,
    summary: bias.summary,
    provenance: tag,
    provenanceLabel: provenanceLabel(tag),
    sampleGate: gate,
  };
}

function signalFromGrudge(story: GrudgeStoryline, dataTag: ProvenanceTag): SyndicatedSignal {
  return {
    id: story.id,
    kind: "grudge_match",
    matchup: story.headline,
    headline: story.headline,
    summary: story.summary,
    provenance: dataTag,
    provenanceLabel: provenanceLabel(dataTag),
  };
}

function signalFromPpPremium(
  signal: NhlPpPremiumSignal,
  dataTag: ProvenanceTag,
): SyndicatedSignal | null {
  const gate = signal.provenance?.sampleGate;
  if (gate && !gate.cleared) return null;

  const tag = signal.provenance?.index.tag ?? dataTag;
  return {
    id: `pp-${signal.gameId}`,
    kind: "pp_premium",
    matchup: signal.matchup,
    headline: signal.headline,
    summary: signal.summary,
    provenance: tag,
    provenanceLabel: provenanceLabel(tag),
    sampleGate: gate,
    metrics: {
      index: signal.index,
      refMinorRate: signal.refMinorRate,
    },
  };
}

function signalFromOtRate(
  signal: NhlOtRateSignal,
  dataTag: ProvenanceTag,
): SyndicatedSignal | null {
  const gate = signal.provenance?.sampleGate;
  if (gate && !gate.cleared) return null;

  const tag = signal.provenance?.refereeOtRate.tag ?? dataTag;
  return {
    id: `ot-${signal.gameId}`,
    kind: "ot_rate",
    matchup: signal.matchup,
    headline: signal.headline,
    summary: signal.summary,
    provenance: tag,
    provenanceLabel: provenanceLabel(tag),
    sampleGate: gate,
    metrics: {
      refereeOtRate: signal.refereeOtRate,
    },
  };
}

export function buildNbaNightlyFeed(): NightlyFeed {
  if (nbaFeedCache) return nbaFeedCache;
  const assignments = getNbaAssignments();
  const stats = getNbaRefStats();
  const odds = getNbaOdds();
  const { games, isPreview } = resolveSlateGames(assignments);
  const dataTag = refStatsDataTag(stats.meta);
  const premiums = computeSlatePremiums(games, stats, odds);
  const alerts = paceAlerts(premiums);
  const homeBias = computeSlateHomeBias(games, stats);
  const storylines = computeSlateStorylines(games, stats, 5);

  const signals: SyndicatedSignal[] = [];
  for (const alert of alerts) {
    const signal = signalFromPaceAlert(alert, dataTag);
    if (signal) signals.push(signal);
  }
  for (const bias of homeBias) {
    const signal = signalFromHomeBias(bias, dataTag);
    if (signal) signals.push(signal);
  }
  for (const story of storylines.slice(0, 3)) {
    signals.push(signalFromGrudge(story, dataTag));
  }

  return (nbaFeedCache = {
    generatedAt: new Date().toISOString(),
    slateDate: assignments.date,
    league: "NBA",
    isPreview,
    assignmentsSource: assignments.source,
    statsSource: stats.meta.source,
    pageUrl: absoluteUrl("/"),
    disclaimer: SYNDICATION_DISCLAIMER,
    signals,
  });
}

export function buildNhlNightlyFeed(): NightlyFeed {
  if (nhlFeedCache) return nhlFeedCache;
  const assignments = getNhlAssignments();
  const stats = getNhlRefStats();
  const odds = getNhlOdds();
  const { games, isPreview } = resolveSlateGames(assignments);
  const dataTag = refStatsDataTag(stats.meta);
  const premiums = computeNhlSlatePremiums(games, stats, odds);
  const alerts = nhlPaceAlerts(premiums);
  const homeBias = computeNhlSlateHomeBias(games, stats);
  const ppPremiums = computeSlatePpPremiums(games, stats, odds);
  const otSignals = computeSlateOtSignals(games, stats, odds);

  const signals: SyndicatedSignal[] = [];
  for (const alert of alerts) {
    const signal = signalFromPaceAlert(alert, dataTag);
    if (signal) signals.push(signal);
  }
  for (const bias of homeBias) {
    const signal = signalFromHomeBias(bias, dataTag);
    if (signal) signals.push(signal);
  }
  for (const pp of ppPremiums.slice(0, 5)) {
    const signal = signalFromPpPremium(pp, dataTag);
    if (signal) signals.push(signal);
  }
  for (const ot of otSignals.slice(0, 3)) {
    const signal = signalFromOtRate(ot, dataTag);
    if (signal) signals.push(signal);
  }

  return (nhlFeedCache = {
    generatedAt: new Date().toISOString(),
    slateDate: assignments.date,
    league: "NHL",
    isPreview,
    assignmentsSource: assignments.source,
    statsSource: stats.meta.source,
    pageUrl: absoluteUrl("/nhl"),
    disclaimer: SYNDICATION_DISCLAIMER,
    signals,
  });
}

export function topShareSignals(feed: NightlyFeed, limit = 5): SyndicatedSignal[] {
  const ranked = [...feed.signals].sort((a, b) => {
    const aGap = Math.abs(Number(a.metrics?.gapVsBenchmark ?? a.metrics?.index ?? 0));
    const bGap = Math.abs(Number(b.metrics?.gapVsBenchmark ?? b.metrics?.index ?? 0));
    return bGap - aGap;
  });
  return ranked.slice(0, limit);
}

export function buildShareText(feed: NightlyFeed): string {
  const lines: string[] = [];
  lines.push(
    `Ref Watch ${feed.league} slate — ${feed.slateDate}${feed.isPreview ? " (preview)" : ""}`,
  );
  lines.push("");

  if (feed.signals.length === 0) {
    lines.push("No sample-gated signals cleared for tonight.");
  } else {
    lines.push("Top signals (sample-gated):");
    for (const signal of topShareSignals(feed)) {
      lines.push(
        `• ${signal.matchup}: ${signal.headline}${isEstimatedTag(signal.provenance) ? ` [${signal.provenanceLabel}]` : ""}`,
      );
    }
  }

  lines.push("");
  lines.push(feed.disclaimer);
  lines.push(feed.pageUrl);
  return lines.join("\n");
}

export function slateMetadataDescription(feed: NightlyFeed): string {
  const gameCount =
    feed.league === "NBA"
      ? resolveSlateGames(getNbaAssignments()).games.length
      : resolveSlateGames(getNhlAssignments()).games.length;

  if (gameCount === 0) {
    return `${feed.league} slate empty — check back after assignments drop. ${AFFILIATION_SHORT}`;
  }

  const top = topShareSignals(feed, 3);
  if (top.length === 0) {
    return `${gameCount} ${feed.league} game${gameCount === 1 ? "" : "s"} tonight — crew metrics with sample gates; no high-signal alerts cleared. ${AFFILIATION_SHORT}`;
  }

  const hooks = top
    .map((s) => `${s.matchup}: ${s.headline}`)
    .join(" · ");
  const previewNote = feed.isPreview ? " Preview slate." : "";
  return `${gameCount} game${gameCount === 1 ? "" : "s"} — ${hooks}.${previewNote} ${AFFILIATION_SHORT}`;
}

const AFFILIATION_SHORT = "Not affiliated with the league. Informational only.";

export function slateSportsEvents(
  league: "NBA" | "NHL",
): Array<Record<string, unknown>> {
  const assignments =
    league === "NBA" ? getNbaAssignments() : getNhlAssignments();
  const { games } = resolveSlateGames(assignments);

  return games.map((game) => ({
    "@type": "SportsEvent",
    name: game.matchup,
    sport: league === "NBA" ? "Basketball" : "Ice Hockey",
    startDate: assignments.date,
    location: {
      "@type": "Place",
      name: game.homeTeam,
    },
    competitor: [
      { "@type": "SportsTeam", name: game.awayTeam },
      { "@type": "SportsTeam", name: game.homeTeam },
    ],
    description: `Official ${league} referee crew assignment with historical scoring and whistle trends.`,
  }));
}

export function slateDatasetJsonLd(feed: NightlyFeed): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Ref Watch ${feed.league} nightly slate signals`,
    description: slateMetadataDescription(feed),
    url: feed.pageUrl,
    dateModified: feed.generatedAt,
    temporalCoverage: feed.slateDate,
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    creator: {
      "@type": "Organization",
      name: "Ref Watch",
    },
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: absoluteUrl(`/feed/${feed.league.toLowerCase()}/json`),
      },
    ],
  };
}

export function researchDatasetJsonLd(
  finding: { id: string; headline: string; summary: string; league: string },
  lastUpdated: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: finding.headline,
    description: finding.summary,
    url: absoluteUrl(`/research/${finding.id}`),
    dateModified: lastUpdated,
    keywords: [finding.league, "referee analytics", "historical tendency"],
    variableMeasured: finding.summary,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Ref Watch" },
  };
}

export function researchHubDatasetJsonLd(
  count: number,
  lastUpdated: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Ref Watch research findings",
    description: `${count} ranked historical patterns from NBA and NHL referee datasets.`,
    url: absoluteUrl("/research"),
    dateModified: lastUpdated,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Ref Watch" },
  };
}

export function refProfileDatasetJsonLd(
  name: string,
  slug: string,
  league: "NBA" | "NHL",
  games: number,
  lastUpdated: string,
): Record<string, unknown> {
  const base = league === "NBA" ? "" : "/nhl";
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${name} referee analytics`,
    description: `Historical scoring, foul, and betting splits for ${name} (${games} games). Sample-gated metrics with plain methodology.`,
    url: absoluteUrl(`${base}/refs/${slug}`),
    dateModified: lastUpdated,
    variableMeasured: [
      "Average combined score",
      "Over rate vs league baseline",
      "Foul rate delta",
      "ATS and O/U splits where closing lines exist",
    ],
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Ref Watch" },
  };
}
