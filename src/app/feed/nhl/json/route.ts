import { FEED_CACHE_CONTROL } from "@/lib/cache-control";
import { buildNhlNightlyFeed } from "@/lib/syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildNhlNightlyFeed();
  return Response.json(feed, {
    headers: {
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
