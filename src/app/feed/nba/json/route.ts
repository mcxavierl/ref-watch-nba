import { FEED_CACHE_CONTROL } from "@/lib/cache-control";
import { buildNbaNightlyFeed } from "@/lib/syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildNbaNightlyFeed();
  return Response.json(feed, {
    headers: {
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
