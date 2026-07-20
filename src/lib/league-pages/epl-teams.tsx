import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamIndexSubtitle } from "@/components/TeamIndexSubtitle";
import { getTeamSplits } from "@/lib/epl/data";
import { loadTeamIndexGameCounts, teamIndexGameCount, countUniqueOfficialsFromSplits } from "@/lib/team-index-game-counts";
import { LEAGUES, leagueGamesUnit } from "@/lib/leagues";
import { EPL_TEAMS, teamFullName } from "@/lib/epl/teams";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("epl", "teams");


export default function EplTeamsIndexPage() {
  const teams = [...EPL_TEAMS].sort((a, b) => a.name.localeCompare(b.name));
  const gameCounts = loadTeamIndexGameCounts("epl");

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="epl">
        <h1 className="page-title">All Premier League teams</h1>
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
            const games = teamIndexGameCount("epl", team.abbr, splits, gameCounts);
            return (
              <li key={team.abbr}>
                <Link
                  href={`/epl/teams/${team.abbr}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <TeamLogo team={team} size="md" sport="epl" plateTone="light" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-zinc-900">
                      {teamFullName(team)}
                    </p>
                    <p className="text-sm text-zinc-600">
                      <TeamIndexSubtitle
                        officialsCount={countUniqueOfficialsFromSplits(splits)}
                        games={games}
                        officialLabel={LEAGUES.epl.officialNounPlural}
                        gamesLabel={leagueGamesUnit("epl")}
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
    </div>
  );
}
