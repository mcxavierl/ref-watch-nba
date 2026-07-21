import { FEED_CACHE_CONTROL } from "@/lib/cache-control";
import { buildEplNightlyFeed } from "@/lib/syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildEplNightlyFeed();
  return Response.json(feed, {
    headers: {
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
