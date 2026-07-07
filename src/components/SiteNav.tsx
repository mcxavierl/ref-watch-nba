"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe2 } from "lucide-react";
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

type SiteNavProps = {
  id?: string;
};

export function LeagueSwitch() {
  const pathname = usePathname();
  const isNhl = pathname.startsWith("/nhl");

  return (
    <div className="league-switch" role="group" aria-label="Select league" data-league={isNhl ? "nhl" : "nba"}>
      <span className="league-switch-thumb" aria-hidden />
      <Link
        href="/"
        aria-label="NBA"
        aria-current={!isNhl ? "page" : undefined}
        className={`league-switch-option${!isNhl ? " league-switch-option--active" : ""}`}
      >
        <Globe2 className="size-3.5 shrink-0" strokeWidth={2} />
        <span>NBA</span>
      </Link>
      <Link
        href="/nhl"
        aria-label="NHL"
        aria-current={isNhl ? "page" : undefined}
        className={`league-switch-option${isNhl ? " league-switch-option--active" : ""}`}
      >
        <LeagueMarkNHL className="size-4 shrink-0" />
        <span>NHL</span>
      </Link>
    </div>
  );
}

export function SiteNav({ id = "site-primary-nav" }: SiteNavProps) {
  const pathname = usePathname();
  const isNhl = pathname.startsWith("/nhl");
  const links = isNhl ? NHL_LINKS : NBA_LINKS;
  const homeHref = isNhl ? "/nhl" : "/";

  return (
    <div id={id} className="site-nav-shell" data-league={isNhl ? "nhl" : "nba"}>
      <nav className="site-nav-rail" aria-label="Site sections">
        {links.map((link) => {
          const active =
            link.href === homeHref
              ? pathname === homeHref
              : link.href === "/research"
                ? pathname.startsWith("/research")
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`site-nav-link${active ? " site-nav-link--active" : ""}`}
            >
              <span className="site-nav-link-label">{link.label}</span>
              {active ? <span className="site-nav-link-indicator" aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
