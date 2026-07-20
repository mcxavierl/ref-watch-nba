import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamIndexSubtitle } from "@/components/TeamIndexSubtitle";
import { getTeamSplits } from "@/lib/cfb/data";
import { loadTeamIndexGameCounts, teamIndexGameCount } from "@/lib/team-index-game-counts";
import { teamFullName, teamsByConference, type CfbTeam } from "@/lib/cfb/teams";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cfb", "teams");


export default function CfbTeamsIndexPage() {
  const byConference = teamsByConference();
  const conferences = Object.keys(byConference) as CfbTeam["conference"][];
  const gameCounts = loadTeamIndexGameCounts("cfb");

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="cfb">
        <h1 className="page-title">All CFB teams</h1>
        <p className="page-lead">
          Pick a team to see how they&apos;ve performed under different official
          crews, scoring, penalties, and home/away splits.
        </p>
      </LeagueHubHero>

      {conferences.map((conference) => {
        const teams = byConference[conference] ?? [];
        return (
          <section key={conference} className="section-block">
            <h2 className="section-title">{conference}</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const splits = getTeamSplits(team.abbr);
                const games = teamIndexGameCount("cfb", team.abbr, splits, gameCounts);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/cfb/teams/${team.abbr}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <TeamLogo team={team} size="md" sport="cfb" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-zinc-900">
                          {teamFullName(team)}
                        </p>
                        <p className="text-sm text-zinc-600">
                          <TeamIndexSubtitle
                            splitsCount={splits.length}
                            games={games}
                          />
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
