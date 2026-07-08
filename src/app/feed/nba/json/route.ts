import { buildNbaNightlyFeed } from "@/lib/syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = buildNbaNightlyFeed();
  return Response.json(feed, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
