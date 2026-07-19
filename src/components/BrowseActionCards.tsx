import { PrefetchLink } from "@/components/PrefetchLink";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import {
  LEAGUE_MANIFEST,
  leagueManifestPath,
  researchViewHref,
  type LeagueManifestId,
} from "@/lib/league-manifest";

type BrowseLink = {
  href: string;
  label: string;
  description: string;
};

const BROWSE_COPY: Record<
  LeagueManifestId,
  Omit<BrowseLink, "href">[] | null
> = {
  nba: [
    { label: "Research findings", description: "NBA dataset patterns ranked by effect size" },
    { label: "Official tendency index", description: "Crew scoring and foul tendencies" },
    { label: "Team histories", description: "Crew splits for every franchise" },
    { label: "Browse all refs", description: "Profiles across seasons" },
    { label: "League trends", description: "Ten-season scoring and foul context" },
  ],
  nhl: [
    { label: "Research findings", description: "NHL dataset patterns ranked by effect size" },
    { label: "Official tendency index", description: "Crew goal and PIM tendencies" },
    { label: "Team histories", description: "Crew splits for every franchise" },
    { label: "Browse all refs", description: "Profiles across seasons" },
    { label: "League trends", description: "Ten-season scoring and penalty context" },
  ],
  nfl: [
    { label: "Research findings", description: "NFL dataset patterns ranked by effect size" },
    { label: "Official tendency index", description: "Crew scoring and flag tendencies" },
    { label: "Team histories", description: "Crew splits for every franchise" },
    { label: "Browse all officials", description: "Profiles across seasons" },
    { label: "League trends", description: "Ten-season scoring and penalty context" },
  ],
  epl: [
    { label: "Research findings", description: "EPL dataset patterns ranked by effect size" },
    { label: "Referee tendency index", description: "Goal and foul tendencies by referee" },
    { label: "Club histories", description: "Crew splits for every PL club" },
    { label: "Browse all refs", description: "Profiles across seasons" },
    { label: "League trends", description: "Ten-season goal and card context" },
  ],
  laliga: [
    { label: "Research findings", description: "La Liga dataset patterns ranked by effect size" },
    { label: "Referee tendency index", description: "Goal and foul tendencies by referee" },
    { label: "Club histories", description: "Crew splits for every La Liga club" },
    { label: "Browse all refs", description: "Profiles across seasons" },
    { label: "League trends", description: "Season goal and card context" },
  ],
  cbb: [
    { label: "Research findings", description: "CBB dataset patterns ranked by effect size" },
    { label: "Official tendency index", description: "Scoring and foul tendencies by referee" },
    { label: "Program histories", description: "Crew splits for tracked D-I programs" },
    { label: "Browse all refs", description: "Profiles across seasons" },
    { label: "League trends", description: "Season scoring and foul context" },
  ],
  cfb: [
    { label: "Research findings", description: "CFB dataset patterns ranked by effect size" },
    { label: "Official tendency index", description: "Penalty and scoring tendencies by referee" },
    { label: "Program histories", description: "Crew splits for tracked programs" },
    { label: "Browse all refs", description: "Profiles across seasons" },
    { label: "League trends", description: "Season scoring and penalty context" },
  ],
  wnba: [
    { label: "Research findings", description: "WNBA dataset patterns ranked by effect size" },
    { label: "Referee tendency index", description: "Crew scoring and foul tendencies" },
    { label: "Team histories", description: "Crew splits for every franchise" },
    { label: "Browse all refs", description: "Profiles across seasons" },
    { label: "League trends", description: "Ten-season scoring and foul context" },
  ],
  mlb: null,
};

function browseLinksForLeague(dataLeague: string): BrowseLink[] {
  const entry = Object.values(LEAGUE_MANIFEST).find((m) => m.dataLeague === dataLeague);
  if (!entry) return [];
  const copy = BROWSE_COPY[entry.id];
  if (!copy) return [];
  const hrefs = [
    researchViewHref(entry.id, "findings"),
    researchViewHref(entry.id, "tendencies"),
    leagueManifestPath(entry.id, "/teams"),
    leagueManifestPath(entry.id, "/refs"),
    researchViewHref(entry.id, "trends"),
  ];
  return copy.map((item, index) => ({ ...item, href: hrefs[index]! }));
}

export function BrowseActionCards({
  league,
  compact = false,
}: {
  league: "NBA" | "NHL" | "WNBA" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  compact?: boolean;
}) {
  const links = browseLinksForLeague(league);
  const gridClass = compact ? "browse-action-compact" : "browse-action-grid";

  return (
    <nav className={gridClass} aria-label="Browse historical data">
      {links.map((link, index) => (
        <PrefetchLink
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
        </PrefetchLink>
      ))}
    </nav>
  );
}
