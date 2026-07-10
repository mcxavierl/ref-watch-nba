import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";

export default async function NhlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await preloadLeagueRefStats(SITE_URL, "nhl");
  return children;
}
