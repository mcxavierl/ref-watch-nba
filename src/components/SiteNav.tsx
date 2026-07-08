"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { METHODOLOGY_NAV_LABEL } from "@/lib/trust-charter";
import { LEAGUE_IDS, LEAGUES, type LeagueId } from "@/lib/leagues";
import { LeagueNavMark, leagueNavLabel } from "@/components/LeagueSwitchMark";

const METHODOLOGY_LINK = { href: "/methodology", label: METHODOLOGY_NAV_LABEL };

const NAV_LINKS: Record<LeagueId, { href: string; label: string }[]> = {
  nba: [
    { href: "/", label: "Slate" },
    { href: "/rankings", label: "Tendencies" },
    { href: "/teams", label: "Teams" },
    { href: "/refs", label: "Refs" },
    { href: "/matrix", label: "Matrix" },
    { href: "/crews", label: "Crews" },
    { href: "/trends", label: "Trends" },
    { href: "/research", label: "Findings" },
    METHODOLOGY_LINK,
  ],
  nhl: [
    { href: "/nhl", label: "Slate" },
    { href: "/nhl/rankings", label: "Tendencies" },
    { href: "/nhl/teams", label: "Teams" },
    { href: "/nhl/refs", label: "Refs" },
    { href: "/nhl/matrix", label: "Matrix" },
    { href: "/nhl/crews", label: "Crews" },
    { href: "/nhl/trends", label: "Trends" },
    { href: "/nhl/research", label: "Findings" },
    METHODOLOGY_LINK,
  ],
  nfl: [
    { href: "/nfl", label: "Slate" },
    { href: "/nfl/rankings", label: "Tendencies" },
    { href: "/nfl/teams", label: "Teams" },
    { href: "/nfl/refs", label: "Refs" },
    { href: "/nfl/matrix", label: "Matrix" },
    { href: "/nfl/crews", label: "Crews" },
    { href: "/nfl/trends", label: "Trends" },
    { href: "/nfl/research", label: "Findings" },
    METHODOLOGY_LINK,
  ],
  wnba: [
    { href: "/wnba", label: "Slate" },
    { href: "/wnba/rankings", label: "Tendencies" },
    METHODOLOGY_LINK,
  ],
  mlb: [
    { href: "/mlb", label: "Slate" },
    { href: "/mlb/rankings", label: "Tendencies" },
    METHODOLOGY_LINK,
  ],
  cbb: [
    { href: "/cbb", label: "Slate" },
    { href: "/cbb/rankings", label: "Tendencies" },
    { href: "/cbb/teams", label: "Teams" },
    { href: "/cbb/refs", label: "Refs" },
    { href: "/cbb/matrix", label: "Matrix" },
    { href: "/cbb/crews", label: "Crews" },
    { href: "/cbb/trends", label: "Trends" },
    { href: "/cbb/research", label: "Findings" },
    METHODOLOGY_LINK,
  ],
  cfb: [
    { href: "/cfb", label: "Slate" },
    { href: "/cfb/rankings", label: "Tendencies" },
    { href: "/cfb/teams", label: "Teams" },
    { href: "/cfb/refs", label: "Refs" },
    { href: "/cfb/matrix", label: "Matrix" },
    { href: "/cfb/crews", label: "Crews" },
    { href: "/cfb/trends", label: "Trends" },
    { href: "/cfb/research", label: "Findings" },
    METHODOLOGY_LINK,
  ],
  epl: [
    { href: "/epl", label: "Slate" },
    { href: "/epl/rankings", label: "Tendencies" },
    { href: "/epl/teams", label: "Teams" },
    { href: "/epl/refs", label: "Refs" },
    { href: "/epl/matrix", label: "Matrix" },
    { href: "/epl/crews", label: "Crews" },
    { href: "/epl/trends", label: "Trends" },
    { href: "/epl/research", label: "Findings" },
    METHODOLOGY_LINK,
  ],
};

const PRO_LEAGUES: LeagueId[] = ["nba", "nhl", "nfl", "epl"];
const COLLEGE_LEAGUES: LeagueId[] = ["cbb", "cfb"];

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
  const league = activeLeague(pathname);

  return (
    <nav className="league-nav" aria-label="Leagues" data-league={league}>
      <div className="league-nav-scroll">
        <div className="league-nav-groups">
          <div className="league-nav-group" role="group" aria-label="Professional leagues">
            <div className="league-nav-links">
              {PRO_LEAGUES.map((id) => (
                <LeagueNavLink key={id} id={id} active={league === id} />
              ))}
            </div>
          </div>

          <span className="league-nav-divider" aria-hidden />

          <div className="league-nav-group" role="group" aria-label="College leagues">
            <span className="league-nav-group-label">College</span>
            <div className="league-nav-links">
              {COLLEGE_LEAGUES.map((id) => (
                <LeagueNavLink key={id} id={id} active={league === id} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

/** @deprecated Use LeagueNav */
export const LeagueSwitch = LeagueNav;

export function SiteNav({ id = "site-primary-nav" }: SiteNavProps) {
  const pathname = usePathname();
  const league = activeLeague(pathname);
  const links = NAV_LINKS[league] ?? NAV_LINKS.nba;
  const homeHref = LEAGUES[league].pathPrefix || "/";

  return (
    <div className="site-subnav">
      <div id={id} className="site-nav-shell" data-league={league}>
        <nav className="site-nav-rail" aria-label="Site sections">
          {links.map((link) => {
            const active =
              link.href === homeHref
                ? pathname === homeHref
                : link.href === "/methodology"
                  ? pathname === "/methodology"
                  : link.href.endsWith("/research")
                    ? pathname === link.href ||
                      pathname.startsWith(`${link.href}/`)
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`site-nav-link${active ? " site-nav-link--active" : ""}`}
              >
                <span className="site-nav-link-label">{link.label}</span>
                {active ? (
                  <span className="site-nav-link-indicator" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
