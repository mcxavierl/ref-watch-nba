import { PrefetchLink } from "@/components/PrefetchLink";
import {
  buildRefProfileDiscovery,
  formatSimilarProfileMetrics,
} from "@/lib/ref-profile-discovery";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";
import "@/components/ref-profile/ref-profile-discovery.css";

export function RefProfileDiscoveryPanel({
  leagueId,
  profile,
}: {
  leagueId: LeagueId;
  profile: RefProfile;
}) {
  const discovery = buildRefProfileDiscovery(leagueId, profile);
  const hasContent =
    discovery.pairedCrewMembers.length > 0 ||
    discovery.similarProfiles.length > 0 ||
    discovery.upcomingGames.length > 0;

  if (!hasContent) return null;

  return (
    <section
      className="ref-profile-discovery mt-8 border-t border-border-subtle pt-8"
      aria-labelledby="ref-profile-discovery-title"
    >
      <div className="ref-table-section-header">
        <h2 id="ref-profile-discovery-title" className="ref-profile-section-title m-0">
          Keep researching
        </h2>
        <p className="ref-profile-section-lead mt-1 text-sm">
          Related officials and upcoming assignments to extend your read.
        </p>
      </div>

      <div className="ref-profile-discovery-grid mt-5 grid gap-4 lg:grid-cols-3">
        {discovery.pairedCrewMembers.length > 0 ? (
          <article className="ref-profile-discovery-card">
            <h3 className="ref-profile-discovery-card-title">
              Frequently paired crew members
            </h3>
            <ul className="mt-3 space-y-2">
              {discovery.pairedCrewMembers.map((member) => (
                <li key={member.slug}>
                  <PrefetchLink
                    href={member.href}
                    className="ref-profile-discovery-link ref-profile-discovery-link-row"
                  >
                    <span className="ref-profile-discovery-link-name">{member.name}</span>
                    <span className="ref-profile-discovery-link-meta tabular-nums">
                      {member.sharedGames} shared
                    </span>
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {discovery.similarProfiles.length > 0 ? (
          <article className="ref-profile-discovery-card">
            <h3 className="ref-profile-discovery-card-title">
              Similar whistle profiles
            </h3>
            <ul className="mt-3 space-y-3">
              {discovery.similarProfiles.map((similar) => (
                <li key={similar.slug}>
                  <PrefetchLink href={similar.href} className="ref-profile-discovery-link">
                    <span className="ref-profile-discovery-link-name">{similar.name}</span>
                    <span className="ref-profile-discovery-link-detail tabular-nums">
                      {formatSimilarProfileMetrics(similar)}
                    </span>
                    <span className="ref-profile-discovery-link-detail">
                      {similar.summary}
                    </span>
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {discovery.upcomingGames.length > 0 ? (
          <article className="ref-profile-discovery-card">
            <h3 className="ref-profile-discovery-card-title">
              Upcoming games scheduled
            </h3>
            <ul className="mt-3 space-y-2">
              {discovery.upcomingGames.map((game) => (
                <li key={game.gameId}>
                  <PrefetchLink href={game.href} className="ref-profile-discovery-link">
                    <span className="ref-profile-discovery-link-name">{game.matchup}</span>
                    {game.slateDate ? (
                      <span className="ref-profile-discovery-link-detail tabular-nums">
                        {game.slateDate}
                      </span>
                    ) : null}
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </section>
  );
}
