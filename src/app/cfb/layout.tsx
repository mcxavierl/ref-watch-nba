import { CollegeLeagueGate } from "@/components/CollegeLeagueGate";
import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";

export default async function CfbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/cfb";
  await preloadLeagueRefStatsForPath(SITE_URL, "cfb", pathname);

  return <CollegeLeagueGate leagueId="cfb">{children}</CollegeLeagueGate>;
}
