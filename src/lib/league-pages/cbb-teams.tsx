import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { NcaaConferenceLogo } from "@/components/NcaaConferenceLogo";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamIndexSubtitle } from "@/components/TeamIndexSubtitle";
import { getTeamSplits } from "@/lib/cbb/data";
import { loadTeamIndexGameCounts, teamIndexGameCount, countUniqueOfficialsFromSplits } from "@/lib/team-index-game-counts";
import { LEAGUES } from "@/lib/leagues";
import {
  CBB_CONFERENCE_DISPLAY_ORDER,
  teamFullName,
  teamsByConference,
  type CbbTeam,
} from "@/lib/cbb/teams";
import {
  isLiveNcaaConference,
  type LiveNcaaConferenceId,
} from "@/lib/ncaa-conference-gate";
import { hubPageMetadata } from "@/lib/seo";
import "@/components/conference-coverage.css";
export const metadata = hubPageMetadata("cbb", "teams");


export default function CbbTeamsIndexPage() {
  const byConference = teamsByConference();
  const conferences = CBB_CONFERENCE_DISPLAY_ORDER.filter(
    (conference) => (byConference[conference]?.length ?? 0) > 0,
  );
  const gameCounts = loadTeamIndexGameCounts("cbb");

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="cbb">
        <h1 className="page-title">All CBB teams</h1>
        <p className="page-lead">
          Pick a team to see how they&apos;ve performed under different referees:
          scoring, fouls, and home/away splits.
        </p>
      </LeagueHubHero>

      {conferences.map((conference) => {
        const teams = byConference[conference] ?? [];
        return (
          <section key={conference} className="section-block">
            <h2 className="section-title cbb-teams-conference-heading">
              {isLiveNcaaConference(conference) ? (
                <NcaaConferenceLogo
                  conferenceId={conference as LiveNcaaConferenceId}
                  size={28}
                />
              ) : null}
              <span>{conference}</span>
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const splits = getTeamSplits(team.abbr);
                const games = teamIndexGameCount("cbb", team.abbr, splits, gameCounts);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/cbb/teams/${team.abbr}`}
                      className="team-index-link flex items-center gap-3 rounded-lg border px-3 py-2.5"
                      data-league="cbb"
                    >
                      <TeamLogo team={team} size="md" sport="cbb" plateTone="light" />
                      <div className="min-w-0 flex-1">
                        <p className="team-index-name truncate text-base font-medium">
                          {teamFullName(team)}
                        </p>
                        <p className="team-index-meta text-sm">
                          <TeamIndexSubtitle
                            officialsCount={countUniqueOfficialsFromSplits(splits)}
                            games={games}
                            officialLabel={LEAGUES.cbb.officialNounPlural}
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
