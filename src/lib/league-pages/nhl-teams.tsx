import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamIndexSubtitle } from "@/components/TeamIndexSubtitle";
import { getTeamSplits } from "@/lib/nhl/data";
import { loadTeamIndexGameCounts, teamIndexGameCount } from "@/lib/team-index-game-counts";
import { teamFullName, teamsByConference } from "@/lib/nhl/teams";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nhl", "teams");


export default function NhlTeamsIndexPage() {
  const { East, West } = teamsByConference();
  const gameCounts = loadTeamIndexGameCounts("nhl");

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="nhl">
        <h1 className="page-title">All NHL teams</h1>
        <p className="page-lead">
          Pick a team to see how they&apos;ve performed under different official
          crews, goals, PIM, and home/away splits.
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
                const games = teamIndexGameCount("nhl", team.abbr, splits, gameCounts);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/nhl/teams/${team.abbr}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <TeamLogo team={team} size="md" sport="nhl" plateTone="light" />
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
