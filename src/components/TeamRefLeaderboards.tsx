import { TeamRefRankingsTable } from "@/components/TeamRefRankingsTable";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";

export function TeamRefLeaderboards({
  entries,
  teamLabel,
  overBaseline,
}: {
  entries: TeamRefLeaderboardEntry[];
  teamLabel: string;
  overBaseline: number;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-zinc-700">Ref rankings</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Every official with {TEAM_REF_MIN_GAMES}+ {teamLabel} games. Sort by win
        rate or foul edge to see who helps or hurts most in this sample.
      </p>
      <div className="data-card mt-3">
        <TeamRefRankingsTable
          entries={entries}
          teamLabel={teamLabel}
          overBaseline={overBaseline}
          defaultSort="foulEdge-desc"
        />
      </div>
    </section>
  );
}
