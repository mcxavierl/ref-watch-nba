"use client";

import { usePathname } from "next/navigation";

import { HeaderNavLink } from "@/components/HeaderNavLink";

import {
  LEAGUE_MANIFEST,
  LEAGUE_SLATE_NAV_LABEL,
  leagueSectionNavHref,
  type LeagueManifestId,
} from "@/lib/league-manifest";
import { isIngestGatedNavHidden, isNhlNavHidden } from "@/lib/header-leagues";

type SectionKey = "slate" | "teams" | "matrix" | "refs" | "research";

const SECTION_LABELS: Record<SectionKey, string> = {
  slate: LEAGUE_SLATE_NAV_LABEL,
  teams: "Teams",
  matrix: "Matrix",
  refs: "Refs",
  research: "Research",
};

function sectionMatch(pathname: string, leagueId: LeagueManifestId, section: SectionKey): boolean {
  const prefix = LEAGUE_MANIFEST[leagueId].pathPrefix;
  switch (section) {
    case "slate":
      return pathname === prefix;
    case "teams":
      return pathname === `${prefix}/teams` || pathname.startsWith(`${prefix}/teams/`);
    case "matrix":
      return pathname === `${prefix}/matrix` || pathname.startsWith(`${prefix}/matrix/`);
    case "refs":
      return pathname === `${prefix}/refs` || pathname.startsWith(`${prefix}/refs/`);
    case "research":
      return (
        pathname.startsWith(`${prefix}/research`) ||
        pathname === `${prefix}/rankings` ||
        pathname === `${prefix}/trends` ||
        pathname.startsWith(`${prefix}/research/`)
      );
    default:
      return false;
  }
}

type LeagueSectionNavProps = {
  leagueId: LeagueManifestId;
  id?: string;
};

/** Persistent section nav rendered inside [league]/layout.tsx */
export function LeagueSectionNav({ leagueId, id = "league-section-nav" }: LeagueSectionNavProps) {
  const pathname = usePathname() ?? "/";
  const entry = LEAGUE_MANIFEST[leagueId];

  if (isIngestGatedNavHidden(leagueId) || isNhlNavHidden(leagueId)) {
    return null;
  }

  return (
    <div id={id} className="site-nav-shell league-section-nav" data-league={leagueId}>
      <nav className="site-nav-rail" aria-label={`${entry.shortLabel} sections`}>
        {entry.sectionNav.map((section) => {
          const href = leagueSectionNavHref(leagueId, section);
          const active = sectionMatch(pathname, leagueId, section);
          return (
            <HeaderNavLink
              key={section}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`site-nav-link${active ? " site-nav-link--active" : ""}`}
            >
              <span className="site-nav-link-label">{SECTION_LABELS[section]}</span>
            </HeaderNavLink>
          );
        })}
      </nav>
    </div>
  );
}
