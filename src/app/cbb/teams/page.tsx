import type { Metadata } from "next";
import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import { getTeamSplits } from "@/lib/cbb/data";
import { teamFullName, teamsByConference, type CbbTeam } from "@/lib/cbb/teams";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "All CBB teams | Ref Watch",
  description:
    "Browse referee crew history for NCAA men's basketball teams: scoring trends, foul patterns, and home/away records.",
};

export default function CbbTeamsIndexPage() {
  const byConference = teamsByConference();
  const conferences = Object.keys(byConference) as CbbTeam["conference"][];

  return (
    <div className="page-shell">
      <section className="page-hero">
        <h1 className="page-title">All CBB teams</h1>
        <p className="page-lead">
          Pick a team to see how they&apos;ve performed under different referee
          crews: scoring, fouls, and home/away splits.
        </p>
      </section>

      {conferences.map((conference) => {
        const teams = byConference[conference] ?? [];
        return (
          <section key={conference} className="section-block">
            <h2 className="section-title">{conference}</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const splits = getTeamSplits(team.abbr);
                const games = splits.reduce((s, sp) => s + sp.games, 0);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/cbb/teams/${team.abbr}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <TeamLogo team={team} size="md" sport="cbb" />
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
