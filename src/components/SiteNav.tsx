"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LeagueNavMark, leagueNavLabel } from "@/components/LeagueSwitchMark";
import { getHeaderLeagueIds } from "@/lib/header-leagues";
import {
  headerActiveLeague,
  leagueHubHref,
  LEAGUES,
  type LeagueId,
} from "@/lib/leagues";

function LeagueNavLink({
  id,
  active,
}: {
  id: LeagueId;
  active: boolean;
}) {
  const config = LEAGUES[id];
  return (
    <Link
      href={leagueHubHref(id)}
      aria-label={leagueNavLabel(id)}
      aria-current={active ? "page" : undefined}
      className={`league-nav-link${active ? " league-nav-link--active" : ""}`}
      data-league={id}
    >
      <LeagueNavMark league={id} active={active} />
      <span className="league-nav-label">{config.shortLabel}</span>
    </Link>
  );
}

export function LeagueNav() {
  const pathname = usePathname();
  const league = headerActiveLeague(pathname ?? "/");
  const headerLeagues = getHeaderLeagueIds();

  return (
    <nav className="league-nav" aria-label="Leagues" data-league={league ?? "overview"}>
      <div className="league-nav-scroll">
        <div className="league-nav-links">
          {headerLeagues.map((id) => (
            <LeagueNavLink key={id} id={id} active={league === id} />
          ))}
        </div>
      </div>
    </nav>
  );
}

/** @deprecated Section nav lives in LeagueSectionNav inside [league]/layout.tsx */
export const LeagueSwitch = LeagueNav;

/** @deprecated Section nav lives in LeagueSectionNav inside [league]/layout.tsx */
export function SiteNav() {
  return null;
}
