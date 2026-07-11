import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { TeamLogo } from "@/components/TeamLogo";
import { getTeamSplits } from "@/lib/laliga/data";
import { LALIGA_TEAMS, teamFullName } from "@/lib/laliga/teams";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("laliga", "teams");


export const dynamic = "force-static";

export default function LaligaTeamsIndexPage() {
  const teams = [...LALIGA_TEAMS].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="laliga">
        <h1 className="page-title">All La Liga teams</h1>
        <p className="page-lead">
          Pick a club to see how they&apos;ve performed under different referees:
          goals, fouls, cards, and home/away splits. 2025-26 roster includes Leeds,
          Burnley, and Sunderland.
        </p>
      </LeagueHubHero>

      <section className="section-block">
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const splits = getTeamSplits(team.abbr);
            const games = splits.reduce((s, sp) => s + sp.games, 0);
            return (
              <li key={team.abbr}>
                <Link
                  href={`/laliga/teams/${team.abbr}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <TeamLogo team={team} size="md" sport="laliga" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-zinc-900">
                      {teamFullName(team)}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {splits.length > 0
                        ? `${splits.length} refs · ${games} matches`
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
    </div>
  );
}
