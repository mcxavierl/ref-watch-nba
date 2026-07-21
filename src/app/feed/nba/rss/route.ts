import { FEED_CACHE_CONTROL } from "@/lib/cache-control";
import { buildNbaNightlyFeed } from "@/lib/syndication";
import { nightlyFeedToRss } from "@/lib/rss";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildNbaNightlyFeed();
  return new Response(nightlyFeedToRss(feed), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
