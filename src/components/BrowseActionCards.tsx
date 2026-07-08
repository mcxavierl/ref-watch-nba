import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";

type BrowseLink = {
  href: string;
  label: string;
  description: string;
};

const NBA_LINKS: BrowseLink[] = [
  {
    href: "/research",
    label: "Research findings",
    description: "NBA dataset patterns ranked by effect size",
  },
  {
    href: "/rankings",
    label: "Official tendency index",
    description: "Crew scoring and foul tendencies",
  },
  {
    href: "/teams",
    label: "Team histories",
    description: "Crew splits for every franchise",
  },
  {
    href: "/refs",
    label: "Browse all refs",
    description: "Profiles across seasons",
  },
  {
    href: "/trends",
    label: "League trends",
    description: "Five-season scoring and foul context",
  },
];

const NHL_LINKS: BrowseLink[] = [
  {
    href: "/nhl/research",
    label: "Research findings",
    description: "NHL dataset patterns ranked by effect size",
  },
  {
    href: "/nhl/rankings",
    label: "Official tendency index",
    description: "Crew goal and PIM tendencies",
  },
  {
    href: "/nhl/teams",
    label: "Team histories",
    description: "Crew splits for every franchise",
  },
  {
    href: "/nhl/refs",
    label: "Browse all refs",
    description: "Profiles across seasons",
  },
  {
    href: "/nhl/trends",
    label: "League trends",
    description: "Five-season scoring and penalty context",
  },
];

const NFL_LINKS: BrowseLink[] = [
  {
    href: "/nfl/research",
    label: "Research findings",
    description: "NFL dataset patterns ranked by effect size",
  },
  {
    href: "/nfl/rankings",
    label: "Official tendency index",
    description: "Crew scoring and flag tendencies",
  },
  {
    href: "/nfl/teams",
    label: "Team histories",
    description: "Crew splits for every franchise",
  },
  {
    href: "/nfl/refs",
    label: "Browse all officials",
    description: "Profiles across seasons",
  },
  {
    href: "/nfl/trends",
    label: "League trends",
    description: "Five-season scoring and penalty context",
  },
];

const EPL_LINKS: BrowseLink[] = [
  {
    href: "/epl/research",
    label: "Research findings",
    description: "EPL dataset patterns ranked by effect size",
  },
  {
    href: "/epl/rankings",
    label: "Referee tendency index",
    description: "Goal and foul tendencies by referee",
  },
  {
    href: "/epl/teams",
    label: "Club histories",
    description: "Crew splits for every PL club",
  },
  {
    href: "/epl/refs",
    label: "Browse all refs",
    description: "Profiles across seasons",
  },
  {
    href: "/epl/trends",
    label: "League trends",
    description: "Five-season goal and card context",
  },
];

export function BrowseActionCards({
  league,
  compact = false,
}: {
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
  compact?: boolean;
}) {
  const links =
    league === "NBA"
      ? NBA_LINKS
      : league === "NFL"
        ? NFL_LINKS
        : league === "EPL"
          ? EPL_LINKS
          : NHL_LINKS;
  const gridClass = compact ? "browse-action-compact" : "browse-action-grid";

  return (
    <nav className={gridClass} aria-label="Browse historical data">
      {links.map((link, index) => (
        <Link
          key={link.href}
          href={link.href}
          className={compact ? "browse-action-compact-card" : "browse-action-card"}
          style={{ "--browse-i": index } as CSSProperties}
        >
          <span
            className={
              compact ? "browse-action-compact-title" : "browse-action-card-title"
            }
          >
            {link.label}
          </span>
          <span
            className={
              compact ? "browse-action-compact-desc" : "browse-action-card-desc"
            }
          >
            {link.description}
          </span>
          <ArrowRight
            className={
              compact ? "browse-action-compact-arrow" : "browse-action-card-arrow"
            }
            aria-hidden
          />
        </Link>
      ))}
    </nav>
  );
}
