"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LeagueNavMark, leagueNavLabel } from "@/components/LeagueSwitchMark";
import { getHeaderLeagueIds, isIngestGatedNavHidden, isNhlNavHidden } from "@/lib/header-leagues";
import { LEAGUE_IDS, LEAGUES, type LeagueId } from "@/lib/leagues";

type NavLink = { href: string; label: string; match: (pathname: string, homeHref: string) => boolean };

function refsMatch(pathname: string, prefix: string): boolean {
  const refs = prefix ? `${prefix}/refs` : "/refs";
  const crews = prefix ? `${prefix}/crews` : "/crews";
  return (
    pathname === refs ||
    pathname.startsWith(`${refs}/`) ||
    pathname === crews ||
    pathname.startsWith(`${crews}/`)
  );
}

function insightsMatch(pathname: string, prefix: string): boolean {
  const paths = ["insights", "rankings", "trends", "research"].map((segment) =>
    prefix ? `${prefix}/${segment}` : `/${segment}`,
  );
  return paths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

const NAV_LINKS: Record<LeagueId, NavLink[]> = {
  nba: [
    {
      href: "/",
      label: "Slate",
      match: (pathname, home) => pathname === home,
    },
    {
      href: "/teams",
      label: "Teams",
      match: (pathname) => pathname === "/teams" || pathname.startsWith("/teams/"),
    },
    {
      href: "/matrix",
      label: "Matrix",
      match: (pathname) => pathname === "/matrix" || pathname.startsWith("/matrix/"),
    },
    {
      href: "/refs",
      label: "Refs",
      match: (pathname) => refsMatch(pathname, ""),
    },
    {
      href: "/insights",
      label: "Insights",
      match: (pathname) => insightsMatch(pathname, ""),
    },
  ],
  nhl: [
    { href: "/nhl", label: "Slate", match: (p, home) => p === home },
    { href: "/nhl/teams", label: "Teams", match: (p) => p === "/nhl/teams" || p.startsWith("/nhl/teams/") },
    { href: "/nhl/matrix", label: "Matrix", match: (p) => p === "/nhl/matrix" || p.startsWith("/nhl/matrix/") },
    { href: "/nhl/refs", label: "Refs", match: (p) => refsMatch(p, "/nhl") },
    { href: "/nhl/insights", label: "Insights", match: (p) => insightsMatch(p, "/nhl") },
  ],
  nfl: [
    { href: "/nfl", label: "Slate", match: (p, home) => p === home },
    { href: "/nfl/teams", label: "Teams", match: (p) => p === "/nfl/teams" || p.startsWith("/nfl/teams/") },
    { href: "/nfl/matrix", label: "Matrix", match: (p) => p === "/nfl/matrix" || p.startsWith("/nfl/matrix/") },
    { href: "/nfl/refs", label: "Refs", match: (p) => refsMatch(p, "/nfl") },
    { href: "/nfl/insights", label: "Insights", match: (p) => insightsMatch(p, "/nfl") },
  ],
  wnba: [
    { href: "/wnba", label: "Slate", match: (p, home) => p === home },
    { href: "/wnba/rankings", label: "Insights", match: (p) => p === "/wnba/rankings" || p.startsWith("/wnba/rankings/") },
  ],
  mlb: [
    { href: "/mlb", label: "Slate", match: (p, home) => p === home },
    { href: "/mlb/rankings", label: "Insights", match: (p) => p === "/mlb/rankings" || p.startsWith("/mlb/rankings/") },
  ],
  cbb: [
    { href: "/cbb", label: "Slate", match: (p, home) => p === home },
    { href: "/cbb/teams", label: "Teams", match: (p) => p === "/cbb/teams" || p.startsWith("/cbb/teams/") },
    { href: "/cbb/matrix", label: "Matrix", match: (p) => p === "/cbb/matrix" || p.startsWith("/cbb/matrix/") },
    { href: "/cbb/refs", label: "Refs", match: (p) => refsMatch(p, "/cbb") },
    { href: "/cbb/insights", label: "Insights", match: (p) => insightsMatch(p, "/cbb") },
  ],
  cfb: [
    { href: "/cfb", label: "Slate", match: (p, home) => p === home },
    { href: "/cfb/teams", label: "Teams", match: (p) => p === "/cfb/teams" || p.startsWith("/cfb/teams/") },
    { href: "/cfb/matrix", label: "Matrix", match: (p) => p === "/cfb/matrix" || p.startsWith("/cfb/matrix/") },
    { href: "/cfb/refs", label: "Refs", match: (p) => refsMatch(p, "/cfb") },
    { href: "/cfb/insights", label: "Insights", match: (p) => insightsMatch(p, "/cfb") },
  ],
  epl: [
    { href: "/epl", label: "Slate", match: (p, home) => p === home },
    { href: "/epl/teams", label: "Teams", match: (p) => p === "/epl/teams" || p.startsWith("/epl/teams/") },
    { href: "/epl/matrix", label: "Matrix", match: (p) => p === "/epl/matrix" || p.startsWith("/epl/matrix/") },
    { href: "/epl/refs", label: "Refs", match: (p) => refsMatch(p, "/epl") },
    { href: "/epl/insights", label: "Insights", match: (p) => insightsMatch(p, "/epl") },
  ],
};

const HEADER_LEAGUES: LeagueId[] = getHeaderLeagueIds();

function activeLeague(pathname: string): LeagueId {
  for (const id of LEAGUE_IDS) {
    const prefix = LEAGUES[id].pathPrefix;
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return id;
    }
  }
  return "nba";
}

type SiteNavProps = {
  id?: string;
};

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
      href={config.pathPrefix || "/"}
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
  const league = activeLeague(pathname ?? "/");

  return (
    <nav className="league-nav" aria-label="Leagues" data-league={league}>
      <div className="league-nav-scroll">
        <div className="league-nav-links">
          {HEADER_LEAGUES.map((id) => (
            <LeagueNavLink key={id} id={id} active={league === id} />
          ))}
        </div>
      </div>
    </nav>
  );
}

/** @deprecated Use LeagueNav */
export const LeagueSwitch = LeagueNav;

export function SiteNav({ id = "site-primary-nav" }: SiteNavProps) {
  const pathname = usePathname();
  const resolvedPath = pathname ?? "/";
  const league = activeLeague(resolvedPath);

  if (isIngestGatedNavHidden(league) || isNhlNavHidden(league)) {
    return null;
  }

  const links = NAV_LINKS[league] ?? NAV_LINKS.nba;
  const homeHref = LEAGUES[league].pathPrefix || "/";

  return (
    <div id={id} className="site-nav-shell" data-league={league}>
      <nav className="site-nav-rail" aria-label="Site sections">
        {links.map((link) => {
          const active = link.match(resolvedPath, homeHref);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`site-nav-link${active ? " site-nav-link--active" : ""}`}
            >
              <span className="site-nav-link-label">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
