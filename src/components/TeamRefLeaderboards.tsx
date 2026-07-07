import Link from "next/link";
import { formatPct, formatSigned } from "@/lib/data";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";

function LeaderboardTable({
  entries,
  teamAbbr,
  overBaseline,
  kind,
}: {
  entries: TeamRefLeaderboardEntry[];
  teamAbbr: string;
  overBaseline: number;
  kind: "foul" | "scoring";
}) {
  if (entries.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-600">
        No refs with {TEAM_REF_MIN_GAMES}+ games for {teamAbbr} yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {entries.map((entry, index) => (
        <Link
          key={entry.slug}
          href={`/refs/${entry.slug}`}
          className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-zinc-50"
        >
          <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-zinc-500">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 font-medium text-zinc-800">
            {entry.name}
          </span>
          <span className="hidden font-mono text-xs tabular-nums text-zinc-600 sm:inline">
            {entry.games} games
          </span>
          {kind === "foul" ? (
            <>
              <span className="font-mono text-xs tabular-nums text-zinc-900">
                {formatSigned(entry.avgFoulDifferential)} edge
              </span>
              <span className="hidden font-mono text-xs tabular-nums text-zinc-600 md:inline">
                {formatPct(entry.winRate)} wins
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-xs tabular-nums text-zinc-900">
                {entry.avgTotalPoints} avg
              </span>
              <span className="hidden font-mono text-xs tabular-nums text-zinc-600 md:inline">
                {formatPct(entry.overRate)} over {overBaseline}
              </span>
            </>
          )}
        </Link>
      ))}
    </div>
  );
}

export function TeamRefLeaderboards({
  foulEdge,
  scoringPace,
  teamAbbr,
  overBaseline,
}: {
  foulEdge: TeamRefLeaderboardEntry[];
  scoringPace: TeamRefLeaderboardEntry[];
  teamAbbr: string;
  overBaseline: number;
}) {
  return (
    <section className="mt-10 space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700">
          Top refs by foul edge
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Officials who call the most fouls on {teamAbbr}&apos;s opponents in
          games involving {teamAbbr}. Positive edge = more opponent fouls per
          game. Only refs with {TEAM_REF_MIN_GAMES}+ games in this sample.
        </p>
        <div className="data-card mt-3">
          <LeaderboardTable
            entries={foulEdge}
            teamAbbr={teamAbbr}
            overBaseline={overBaseline}
            kind="foul"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">
          Top refs by scoring pace
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Officials whose {teamAbbr} games produce the highest combined scores
          (home + away). Over rate is how often the total beats{" "}
          {overBaseline}. Only refs with {TEAM_REF_MIN_GAMES}+ games in this
          sample.
        </p>
        <div className="data-card mt-3">
          <LeaderboardTable
            entries={scoringPace}
            teamAbbr={teamAbbr}
            overBaseline={overBaseline}
            kind="scoring"
          />
        </div>
      </div>
    </section>
  );
}
