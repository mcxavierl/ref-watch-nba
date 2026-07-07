import Link from "next/link";
import { ArrowRight } from "lucide-react";

type BrowseLink = {
  href: string;
  label: string;
  description: string;
};

const NBA_LINKS: BrowseLink[] = [
  {
    href: "/research?league=nba",
    label: "Research findings",
    description: "NBA dataset patterns ranked by effect size",
  },
  {
    href: "/rankings",
    label: "Referee rankings",
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
    href: "/research?league=nhl",
    label: "Research findings",
    description: "NHL dataset patterns ranked by effect size",
  },
  {
    href: "/nhl/rankings",
    label: "Referee rankings",
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

export function BrowseActionCards({ league }: { league: "NBA" | "NHL" }) {
  const links = league === "NBA" ? NBA_LINKS : NHL_LINKS;

  return (
    <nav className="browse-action-grid" aria-label="Browse historical data">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="browse-action-card">
          <span className="browse-action-card-title">{link.label}</span>
          <span className="browse-action-card-desc">{link.description}</span>
          <ArrowRight className="browse-action-card-arrow" aria-hidden />
        </Link>
      ))}
    </nav>
  );
}
