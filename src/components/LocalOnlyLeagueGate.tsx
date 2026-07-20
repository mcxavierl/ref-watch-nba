import { notFound } from "next/navigation";
import { canAccessLocalOnlyLeagues, isLocalOnlyLeague } from "@/lib/local-only-leagues";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

export function LocalOnlyLeagueGate({
  leagueId,
  children,
}: {
  leagueId: LeagueId;
  children: React.ReactNode;
}) {
  const localOnly = isLocalOnlyLeague(leagueId);
  if (localOnly && !canAccessLocalOnlyLeagues()) {
    notFound();
  }

  if (localOnly && canAccessLocalOnlyLeagues()) {
    const label = LEAGUES[leagueId as LeagueId].label;

    return (
      <>
        <div
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100"
          role="status"
        >
          {label} preview is local only. Full league pages ship after NBA-parity
          build-out.
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
