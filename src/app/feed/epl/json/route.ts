import { buildEplNightlyFeed } from "@/lib/syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildEplNightlyFeed();
  return Response.json(feed, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
