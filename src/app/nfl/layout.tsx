import { LeagueIngestGate } from "@/components/LeagueIngestGate";

export default function NflLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LeagueIngestGate leagueId="nfl">{children}</LeagueIngestGate>;
}
