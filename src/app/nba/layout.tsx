import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";

export default async function NbaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/nba";
  await preloadLeagueRefStatsForPath(SITE_URL, "nba", pathname);
  return children;
}
