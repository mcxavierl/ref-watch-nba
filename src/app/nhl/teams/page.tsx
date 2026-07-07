import type { Metadata } from "next";
import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import { getTeamSplits } from "@/lib/nhl/data";
import { teamFullName, teamsByConference } from "@/lib/nhl/teams";

export const metadata: Metadata = {
  title: "All NHL teams — Ref Watch",
  description:
    "Browse official crew history for all 32 NHL teams — goal trends, PIM patterns, and home/away records.",
};

export default function NhlTeamsIndexPage() {
  const { East, West } = teamsByConference();

  return (
    <div className="page-shell">
      <section className="mb-10">
        <h1 className="page-title">
          All NHL teams
        </h1>
        <p className="page-lead">
          Pick a team to see how they&apos;ve performed under different official
          crews — goals, PIM, and home/away splits.
        </p>
      </section>

      {(["East", "West"] as const).map((conference) => {
        const teams = conference === "East" ? East : West;
        return (
          <section key={conference} className="mb-8">
            <h2 className="mb-3 text-base font-semibold text-zinc-800">
              {conference}ern Conference
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const splits = getTeamSplits(team.abbr);
                const games = splits.reduce((s, sp) => s + sp.games, 0);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/nhl/teams/${team.abbr}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <TeamLogo team={team} size="md" sport="nhl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-zinc-900">
                          {teamFullName(team)}
                        </p>
                        <p className="text-sm text-zinc-600">
                          {splits.length > 0
                            ? `${splits.length} crews · ${games} games`
                            : "No data yet"}
                        </p>
                      </div>
                      <span className="font-mono text-sm text-zinc-500">
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
