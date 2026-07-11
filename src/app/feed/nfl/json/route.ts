import { buildNflNightlyFeed } from "@/lib/syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildNflNightlyFeed();
  return Response.json(feed, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
