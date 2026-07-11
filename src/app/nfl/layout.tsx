import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";

export default async function NflLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/nfl";
  await preloadLeagueRefStatsForPath(SITE_URL, "nfl", pathname);
  return children;
}
