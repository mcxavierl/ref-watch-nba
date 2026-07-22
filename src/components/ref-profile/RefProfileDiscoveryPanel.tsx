import { PrefetchLink } from "@/components/PrefetchLink";
import {
  buildRefProfileDiscovery,
  formatSimilarProfileMetrics,
} from "@/lib/ref-profile-discovery";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

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
        <p className="ref-profile-section-lead mt-1 text-sm text-muted">
          Related officials and upcoming assignments to extend your read.
        </p>
      </div>

      <div className="ref-profile-discovery-grid mt-5 grid gap-4 lg:grid-cols-3">
        {discovery.pairedCrewMembers.length > 0 ? (
          <article className="ref-profile-discovery-card rounded-xl border border-border-subtle bg-surface-raised/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">
              Frequently paired crew members
            </h3>
            <ul className="mt-3 space-y-2">
              {discovery.pairedCrewMembers.map((member) => (
                <li key={member.slug}>
                  <PrefetchLink
                    href={member.href}
                    className="flex items-center justify-between gap-3 text-sm text-zinc-300 hover:text-white"
                  >
                    <span>{member.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                      {member.sharedGames} shared
                    </span>
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {discovery.similarProfiles.length > 0 ? (
          <article className="ref-profile-discovery-card rounded-xl border border-border-subtle bg-surface-raised/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">
              Similar whistle profiles
            </h3>
            <ul className="mt-3 space-y-3">
              {discovery.similarProfiles.map((similar) => (
                <li key={similar.slug}>
                  <PrefetchLink
                    href={similar.href}
                    className="block text-sm text-zinc-300 hover:text-white"
                  >
                    <span className="font-medium">{similar.name}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {formatSimilarProfileMetrics(similar)}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {similar.summary}
                    </span>
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {discovery.upcomingGames.length > 0 ? (
          <article className="ref-profile-discovery-card rounded-xl border border-border-subtle bg-surface-raised/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">
              Upcoming games scheduled
            </h3>
            <ul className="mt-3 space-y-2">
              {discovery.upcomingGames.map((game) => (
                <li key={game.gameId}>
                  <PrefetchLink
                    href={game.href}
                    className="block text-sm text-zinc-300 hover:text-white"
                  >
                    <span>{game.matchup}</span>
                    {game.slateDate ? (
                      <span className="mt-0.5 block text-xs text-zinc-500">
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
