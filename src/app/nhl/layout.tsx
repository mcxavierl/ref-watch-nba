import { LeagueIngestGate } from "@/components/LeagueIngestGate";

export default function NhlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LeagueIngestGate leagueId="nhl">{children}</LeagueIngestGate>;
}
