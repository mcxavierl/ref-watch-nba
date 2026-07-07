import type { Metadata } from "next";
import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import { getTeamSplits } from "@/lib/data";
import { teamFullName, teamsByConference } from "@/lib/teams";

export const metadata: Metadata = {
  title: "All NBA teams — Ref Watch",
  description:
    "Browse referee crew history for all 30 NBA teams — scoring trends, foul patterns, and home/away records.",
};

export default function TeamsIndexPage() {
  const { East, West } = teamsByConference();

  return (
    <div className="page-shell">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
          All NBA teams
        </h1>
        <p className="page-lead">
          Pick a team to see how they&apos;ve performed under different referee
          crews — scoring, fouls, and home/away splits.
        </p>
      </section>

      {(["East", "West"] as const).map((conference) => {
        const teams = conference === "East" ? East : West;
        return (
          <section key={conference} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              {conference}ern Conference
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const splits = getTeamSplits(team.abbr);
                const games = splits.reduce((s, sp) => s + sp.games, 0);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/teams/${team.abbr}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <TeamLogo team={team} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {teamFullName(team)}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          {splits.length > 0
                            ? `${splits.length} crews · ${games} games`
                            : "No data yet"}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-zinc-400">
                        {team.abbr}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
