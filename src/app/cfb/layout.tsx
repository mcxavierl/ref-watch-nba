import { CollegeLeagueGate } from "@/components/CollegeLeagueGate";

export default function CfbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CollegeLeagueGate leagueId="cfb">{children}</CollegeLeagueGate>;
}
