import { LeagueIngestGate } from "@/components/LeagueIngestGate";
import { NflBettingHonestyBanner } from "@/components/NflBettingHonestyBanner";

export default function NflLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LeagueIngestGate leagueId="nfl">
      <NflBettingHonestyBanner />
      {children}
    </LeagueIngestGate>
  );
}
