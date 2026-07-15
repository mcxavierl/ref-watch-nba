import { CollegeLeagueGate } from "@/components/CollegeLeagueGate";
import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";

export default async function CbbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/cbb";
  await preloadLeagueRefStatsForPath(SITE_URL, "cbb", pathname);

  return <CollegeLeagueGate leagueId="cbb">{children}</CollegeLeagueGate>;
}
