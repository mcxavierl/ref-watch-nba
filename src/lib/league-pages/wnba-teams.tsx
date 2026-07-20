import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamIndexSubtitle } from "@/components/TeamIndexSubtitle";
import { getTeamSplits } from "@/lib/wnba/data";
import { loadTeamIndexGameCounts, teamIndexGameCount } from "@/lib/team-index-game-counts";
import { teamFullName, teamLogoUrl, teamsByConference } from "@/lib/wnba/teams";
import { hubPageMetadata } from "@/lib/seo";

export const metadata = hubPageMetadata("wnba", "teams");

export const dynamic = "force-static";

export default function WnbaTeamsIndexPage() {
  const { East, West } = teamsByConference();
  const gameCounts = loadTeamIndexGameCounts("wnba");

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="wnba">
        <h1 className="page-title">All WNBA teams</h1>
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
                const games = teamIndexGameCount("wnba", team.abbr, splits, gameCounts);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/wnba/teams/${team.abbr}`}
                      data-league="wnba"
                      className="team-index-link flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                    >
                      <TeamLogo team={{ ...team, logoUrl: teamLogoUrl(team.abbr) }} size="md" sport="wnba" />
                      <div className="min-w-0 flex-1">
                        <p className="team-index-name truncate text-base font-medium">
                          {teamFullName(team)}
                        </p>
                        <p className="team-index-meta text-sm">
                          <TeamIndexSubtitle
                            splitsCount={splits.length}
                            games={games}
                          />
                        </p>
                      </div>
                      <span className="team-index-abbr font-mono text-sm">
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
