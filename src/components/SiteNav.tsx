"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeagueMarkNBA } from "@/components/icons/LeagueMarkNBA";
import { LeagueMarkNHL } from "@/components/icons/LeagueMarkNHL";

const NBA_LINKS = [
  { href: "/", label: "Slate" },
  { href: "/rankings", label: "Rankings" },
  { href: "/teams", label: "Teams" },
  { href: "/refs", label: "Refs" },
  { href: "/trends", label: "Trends" },
  { href: "/research", label: "Findings" },
];

const NHL_LINKS = [
  { href: "/nhl", label: "Slate" },
  { href: "/nhl/rankings", label: "Rankings" },
  { href: "/nhl/teams", label: "Teams" },
  { href: "/nhl/refs", label: "Refs" },
  { href: "/nhl/trends", label: "Trends" },
  { href: "/research", label: "Findings" },
];

export function SiteNav() {
  const pathname = usePathname();
  const isNhl = pathname.startsWith("/nhl");
  const links = isNhl ? NHL_LINKS : NBA_LINKS;
  const homeHref = isNhl ? "/nhl" : "/";

  return (
    <div className="site-nav-wrap">
      <div
        className="league-toggle shrink-0"
        role="group"
        aria-label="Select league"
      >
        <Link
          href="/"
          aria-label="NBA"
          aria-current={!isNhl ? "page" : undefined}
          className={`league-toggle-segment ${
            !isNhl
              ? "league-toggle-segment-active"
              : "league-toggle-segment-inactive"
          }`}
        >
          <LeagueMarkNBA className="size-3.5 shrink-0" />
          NBA
        </Link>
        <Link
          href="/nhl"
          aria-label="NHL"
          aria-current={isNhl ? "page" : undefined}
          className={`league-toggle-segment ${
            isNhl
              ? "league-toggle-segment-active"
              : "league-toggle-segment-inactive"
          }`}
        >
          <LeagueMarkNHL className="size-3.5 shrink-0" />
          NHL
        </Link>
      </div>
      <nav className="site-nav" aria-label="Site sections">
        {links.map((link) => {
          const active =
            link.href === homeHref
              ? pathname === homeHref
              : link.href === "/research"
                ? pathname.startsWith("/research")
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const isSecondary = link.href !== homeHref;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`site-nav-link ${
                active ? "site-nav-link-active" : "site-nav-link-inactive"
              } ${isSecondary ? "site-nav-link-secondary" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
