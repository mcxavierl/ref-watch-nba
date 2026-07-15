import { CollegeLeagueGate } from "@/components/CollegeLeagueGate";

export default function CbbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CollegeLeagueGate leagueId="cbb">{children}</CollegeLeagueGate>;
}
