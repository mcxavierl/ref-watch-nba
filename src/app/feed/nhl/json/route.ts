import { buildNhlNightlyFeed } from "@/lib/syndication";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const feed = buildNhlNightlyFeed();
  return Response.json(feed, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
