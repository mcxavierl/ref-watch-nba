import type { NightlyFeed } from "@/lib/syndication";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function nightlyFeedToRss(feed: NightlyFeed): string {
  const items =
    feed.signals.length === 0
      ? `<item>
  <title>No signals cleared minimum thresholds</title>
  <link>${escapeXml(feed.pageUrl)}</link>
  <guid isPermaLink="true">${escapeXml(feed.pageUrl)}#empty</guid>
  <pubDate>${new Date(feed.generatedAt).toUTCString()}</pubDate>
  <description>${escapeXml("No signals passed minimum game thresholds for this slate.")}</description>
</item>`
      : feed.signals
          .map(
            (signal) => `<item>
  <title>${escapeXml(`${signal.matchup}: ${signal.headline}`)}</title>
  <link>${escapeXml(feed.pageUrl)}</link>
  <guid isPermaLink="false">${escapeXml(`${feed.pageUrl}#${signal.id}`)}</guid>
  <pubDate>${new Date(feed.generatedAt).toUTCString()}</pubDate>
  <description>${escapeXml(`${signal.summary} [${signal.provenanceLabel}]`)}</description>
</item>`,
          )
          .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Ref Watch ${feed.league} nightly signals</title>
    <link>${escapeXml(feed.pageUrl)}</link>
    <description>${escapeXml(feed.disclaimer)}</description>
    <language>en-ca</language>
    <lastBuildDate>${new Date(feed.generatedAt).toUTCString()}</lastBuildDate>
    <generator>Ref Watch</generator>
${items}
  </channel>
</rss>`;
}
