import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamIndexSubtitle } from "@/components/TeamIndexSubtitle";
import { getTeamSplits } from "@/lib/data";
import { loadTeamIndexGameCounts, teamIndexGameCount } from "@/lib/team-index-game-counts";
import { teamFullName, teamsByConference } from "@/lib/teams";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nba", "teams");


export default function TeamsIndexPage() {
  const { East, West } = teamsByConference();
  const gameCounts = loadTeamIndexGameCounts("nba");

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="nba">
        <h1 className="page-title">All NBA teams</h1>
        <p className="page-lead">
          Pick a team to see how they&apos;ve performed under different referee
          crews: scoring, fouls, and home/away splits.
        </p>
      </LeagueHubHero>

      {(["East", "West"] as const).map((conference) => {
        const teams = conference === "East" ? East : West;
        return (
          <section key={conference} className="section-block">
            <h2 className="section-title">{conference}ern Conference</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const splits = getTeamSplits(team.abbr);
                const games = teamIndexGameCount("nba", team.abbr, splits, gameCounts);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/teams/${team.abbr}`}
                      className="team-index-link flex items-center gap-3 rounded-lg border px-3 py-2.5"
                      data-league="nba"
                    >
                      <TeamLogo team={team} size="md" />
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
                      <span className="team-index-abbr">
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
