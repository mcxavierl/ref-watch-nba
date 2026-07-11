import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";

export default async function NhlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/nhl";
  await preloadLeagueRefStatsForPath(SITE_URL, "nhl", pathname);
  return children;
}
