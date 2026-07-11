import { buildNflNightlyFeed } from "@/lib/syndication";
import { nightlyFeedToRss } from "@/lib/rss";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildNflNightlyFeed();
  return new Response(nightlyFeedToRss(feed), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
