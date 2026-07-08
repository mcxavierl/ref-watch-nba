import { buildNbaNightlyFeed, buildCbbNightlyFeed, buildCfbNightlyFeed, buildEplNightlyFeed, buildNflNightlyFeed, buildNhlNightlyFeed, topShareSignals } from "@/lib/syndication";
import type { NightlyFeed } from "@/lib/syndication";
import { isEstimatedTag } from "@/lib/provenance";

export function ogSlateContent(feed: NightlyFeed) {
  const signals = topShareSignals(feed, 4);
  const estimatedCount = feed.signals.filter((s) => isEstimatedTag(s.provenance)).length;

  return {
    title: `Ref Watch ${feed.league}`,
    subtitle: feed.isPreview
      ? `Preview slate · ${feed.slateDate}`
      : `Tonight · ${feed.slateDate}`,
    signals,
    emptyMessage:
      signals.length === 0
        ? "No signals cleared minimum game thresholds; check crew cards for context."
        : null,
    footer: feed.disclaimer,
    dataNote:
      feed.statsSource === "seeded" || feed.isPreview
        ? "Historical preview, not live assignments."
        : estimatedCount > 0
          ? `${estimatedCount} signal${estimatedCount === 1 ? "" : "s"} use partial or proxy inputs.`
          : "Historical referee trends from ingested game logs.",
  };
}

export function nbaOgContent() {
  return ogSlateContent(buildNbaNightlyFeed());
}

export function nhlOgContent() {
  return ogSlateContent(buildNhlNightlyFeed());
}

export function nflOgContent() { return ogSlateContent(buildNflNightlyFeed()); }

export function cbbOgContent() {
  return ogSlateContent(buildCbbNightlyFeed());
}

export function cfbOgContent() {
  return ogSlateContent(buildCfbNightlyFeed());
}

export function eplOgContent() {
  return ogSlateContent(buildEplNightlyFeed());
}
