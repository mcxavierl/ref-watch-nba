import { TeamRefRankingsTable } from "@/components/TeamRefRankingsTable";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";
import type { TeamSampleRecord } from "@/lib/teamRecord";
import { formatPct } from "@/lib/stats-utils";

export function TeamRefLeaderboards({
  entries,
  teamLabel,
  teamRecord,
  overBaseline,
  basePath = "",
}: {
  entries: TeamRefLeaderboardEntry[];
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  overBaseline: number;
  basePath?: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold text-zinc-800">Ref rankings</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Every official with {TEAM_REF_MIN_GAMES}+ {teamLabel} games. Win rates
        are compared to the team&apos;s {teamRecord.wins}-{teamRecord.losses} (
        {formatPct(teamRecord.winRate)}) record over the same sample.
      </p>
      <div className="data-card mt-3">
        <TeamRefRankingsTable
          entries={entries}
          teamLabel={teamLabel}
          teamRecord={teamRecord}
          overBaseline={overBaseline}
          defaultSort="foulEdge-desc"
          basePath={basePath}
        />
      </div>
    </section>
  );
}
