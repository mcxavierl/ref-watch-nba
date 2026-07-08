"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { METHODOLOGY_NAV_LABEL } from "@/lib/trust-charter";

const METHODOLOGY_LINK = { href: "/methodology", label: METHODOLOGY_NAV_LABEL };

const NBA_LINKS = [
  { href: "/", label: "Slate" },
  { href: "/rankings", label: "Tendencies" },
  { href: "/teams", label: "Teams" },
  { href: "/refs", label: "Refs" },
  { href: "/matrix", label: "Matrix" },
  { href: "/crews", label: "Crews" },
  { href: "/trends", label: "Trends" },
  { href: "/research", label: "Findings" },
  METHODOLOGY_LINK,
];

const NHL_LINKS = [
  { href: "/nhl", label: "Slate" },
  { href: "/nhl/rankings", label: "Tendencies" },
  { href: "/nhl/teams", label: "Teams" },
  { href: "/nhl/refs", label: "Refs" },
  { href: "/nhl/matrix", label: "Matrix" },
  { href: "/nhl/crews", label: "Crews" },
  { href: "/nhl/trends", label: "Trends" },
  { href: "/nhl/research", label: "Findings" },
  METHODOLOGY_LINK,
];

const NFL_LINKS = [
  { href: "/nfl", label: "Slate" },
  { href: "/nfl/rankings", label: "Tendencies" },
  { href: "/nfl/teams", label: "Teams" },
  { href: "/nfl/refs", label: "Refs" },
  { href: "/nfl/matrix", label: "Matrix" },
  { href: "/nfl/crews", label: "Crews" },
  { href: "/nfl/trends", label: "Trends" },
  { href: "/nfl/research", label: "Findings" },
  METHODOLOGY_LINK,
];

type LeagueId = "nba" | "nhl" | "nfl";

function activeLeague(pathname: string): LeagueId {
  if (pathname.startsWith("/nfl")) return "nfl";
  if (pathname.startsWith("/nhl")) return "nhl";
  return "nba";
}

type SiteNavProps = {
  id?: string;
};

export function LeagueSwitch() {
  const pathname = usePathname();
  const league = activeLeague(pathname);

  return (
    <div className="league-switch" role="group" aria-label="Select league" data-league={league}>
      <span className="league-switch-thumb" aria-hidden />
      <Link
        href="/"
        aria-label="NBA"
        aria-current={league === "nba" ? "page" : undefined}
        className={`league-switch-option${league === "nba" ? " league-switch-option--active" : ""}`}
      >
        NBA
      </Link>
      <Link
        href="/nhl"
        aria-label="NHL"
        aria-current={league === "nhl" ? "page" : undefined}
        className={`league-switch-option${league === "nhl" ? " league-switch-option--active" : ""}`}
      >
        NHL
      </Link>
      <Link
        href="/nfl"
        aria-label="NFL"
        aria-current={league === "nfl" ? "page" : undefined}
        className={`league-switch-option${league === "nfl" ? " league-switch-option--active" : ""}`}
      >
        NFL
      </Link>
    </div>
  );
}

export function SiteNav({ id = "site-primary-nav" }: SiteNavProps) {
  const pathname = usePathname();
  const league = activeLeague(pathname);
  const links =
    league === "nfl" ? NFL_LINKS : league === "nhl" ? NHL_LINKS : NBA_LINKS;
  const homeHref = league === "nba" ? "/" : `/${league}`;

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
