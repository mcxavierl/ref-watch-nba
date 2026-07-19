import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { NcaaConferenceLogo } from "@/components/NcaaConferenceLogo";
import { TeamLogo } from "@/components/TeamLogo";
import { VerifiedGamesHint } from "@/components/VerifiedGamesHint";
import { getRefStats, getTeamSplits } from "@/lib/cbb/data";
import { loadTeamIndexGameCounts, teamIndexGameCount } from "@/lib/team-index-game-counts";
import { teamFullName, teamsByConference, type CbbTeam } from "@/lib/cbb/teams";
import {
  isLiveNcaaConference,
  type LiveNcaaConferenceId,
} from "@/lib/ncaa-conference-gate";
import { hubPageMetadata } from "@/lib/seo";
import "@/components/conference-coverage.css";
export const metadata = hubPageMetadata("cbb", "teams");


export const dynamic = "force-static";

function refCountForTeam(abbr: string, refs: ReturnType<typeof getRefStats>["refs"]): number {
  const key = abbr.toUpperCase();
  return refs.filter((ref) => (ref.teamStats?.[key]?.games ?? 0) > 0).length;
}

export default function CbbTeamsIndexPage() {
  const byConference = teamsByConference();
  const conferences = Object.keys(byConference) as CbbTeam["conference"][];
  const gameCounts = loadTeamIndexGameCounts("cbb");
  const refs = getRefStats().refs;

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
                const refCount = refCountForTeam(team.abbr, refs);
                return (
                  <li key={team.abbr}>
                    <Link
                      href={`/cbb/teams/${team.abbr}`}
                      className="team-index-link flex items-center gap-3 rounded-lg border px-3 py-2.5"
                      data-league="cbb"
                    >
                      <TeamLogo team={team} size="md" sport="cbb" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-zinc-900">
                          {teamFullName(team)}
                        </p>
                        <p className="text-sm text-zinc-600">
                          {refCount > 0
                            ? (
                              <>
                                {refCount} refs ·{" "}
                                <VerifiedGamesHint>{games} games</VerifiedGamesHint>
                              </>
                            )
                            : "No data yet"}
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
