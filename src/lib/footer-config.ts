import type { HubHeroLeagueId } from "@/components/LeagueHubHero";
import type { FooterLeague } from "@/lib/footer-league";
import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES } from "@/lib/leagues";

export type FooterExploreLink = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
};

type FooterLeagueConfig = {
  affiliationLabel: string;
  sourceHref?: string;
  sourceLinkText?: string;
  sourceLead: string;
  historyRange: string;
  notifyLeague?: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  exploreLinks: FooterExploreLink[];
};

const LEAGUE_HISTORY_RANGE: Record<
  Exclude<FooterLeague, "overview">,
  string
> = {
  nba: "2016-17 – 2025-26",
  nhl: "2016-17 – 2025-26",
  nfl: "2000-01 – 2025-26",
  epl: "2016-17 – 2025-26",
  laliga: "2021-22 – 2025-26",
  cbb: "2019-20 – 2025-26",
  cfb: "2020-21 – 2025-26",
};

function leagueExploreLinks(leagueId: HubHeroLeagueId): FooterExploreLink[] {
  const prefix = LEAGUES[leagueId].pathPrefix;
  return [
    {
      key: "insights",
      label: "Insights",
      href: insightsViewHref(leagueId, "tendencies"),
    },
    {
      key: "refs",
      label: "Refs",
      href: prefix ? `${prefix}/refs` : "/refs",
    },
    {
      key: "teams",
      label: "Teams",
      href: prefix ? `${prefix}/teams` : "/teams",
    },
    {
      key: "matrix",
      label: "Matrix",
      href: prefix ? `${prefix}/matrix` : "/matrix",
    },
    {
      key: "methodology",
      label: "Methodology",
      href: "/methodology",
    },
    {
      key: "contact",
      label: "Contact Me",
      href: "mailto:mcxl55@gmail.com",
      external: true,
    },
  ];
}

const OVERVIEW_EXPLORE: FooterExploreLink[] = [
  { key: "nba", label: "NBA hub", href: "/nba" },
  { key: "nfl", label: "NFL hub", href: "/nfl" },
  { key: "nhl", label: "NHL hub", href: "/nhl" },
  { key: "epl", label: "Premier League hub", href: "/epl" },
  { key: "laliga", label: "La Liga hub", href: "/laliga" },
  { key: "about", label: "About", href: "/about" },
  { key: "methodology", label: "Methodology", href: "/methodology" },
  { key: "validation", label: "Closing-line validation", href: "/research/validation" },
  {
    key: "contact",
    label: "Contact Me",
    href: "mailto:mcxl55@gmail.com",
    external: true,
  },
];

const FOOTER_CONFIG: Record<FooterLeague, FooterLeagueConfig> = {
  overview: {
    affiliationLabel: "the NBA, NHL, NFL, Premier League, La Liga, or NCAA",
    sourceLead:
      "Independent multi-league referee research. No sportsbook affiliate links. Assignment sources vary by sport - open a league hub for specifics.",
    historyRange: "2016 – present",
    exploreLinks: OVERVIEW_EXPLORE,
  },
  nba: {
    affiliationLabel: "the NBA",
    sourceHref: "https://official.nba.com/referee-assignments/",
    sourceLinkText: "official.nba.com",
    sourceLead:
      "No sportsbook affiliate links, independent research only. Official assignments from",
    historyRange: LEAGUE_HISTORY_RANGE.nba,
    notifyLeague: "NBA",
    exploreLinks: leagueExploreLinks("nba"),
  },
  nhl: {
    affiliationLabel: "the NHL",
    sourceHref: "https://api-web.nhle.com",
    sourceLinkText: "api-web.nhle.com",
    sourceLead:
      "No sportsbook affiliate links, independent research only. Official assignments from",
    historyRange: LEAGUE_HISTORY_RANGE.nhl,
    notifyLeague: "NHL",
    exploreLinks: leagueExploreLinks("nhl"),
  },
  nfl: {
    affiliationLabel: "the NFL",
    sourceHref: "https://www.espn.com/nfl/",
    sourceLinkText: "espn.com/nfl",
    sourceLead:
      "No sportsbook affiliate links, independent research only. Crew and assignment context from",
    historyRange: LEAGUE_HISTORY_RANGE.nfl,
    notifyLeague: "NFL",
    exploreLinks: leagueExploreLinks("nfl"),
  },
  epl: {
    affiliationLabel: "the Premier League",
    sourceHref: "https://www.premierleague.com",
    sourceLinkText: "premierleague.com",
    sourceLead:
      "No sportsbook affiliate links, independent research only. Match official records from",
    historyRange: LEAGUE_HISTORY_RANGE.epl,
    notifyLeague: "EPL",
    exploreLinks: leagueExploreLinks("epl"),
  },
  laliga: {
    affiliationLabel: "La Liga",
    sourceHref: "https://www.laliga.com",
    sourceLinkText: "laliga.com",
    sourceLead:
      "No sportsbook affiliate links, independent research only. Match official records from",
    historyRange: LEAGUE_HISTORY_RANGE.laliga,
    notifyLeague: "LALIGA",
    exploreLinks: leagueExploreLinks("laliga"),
  },
  cbb: {
    affiliationLabel: "NCAA men's basketball",
    sourceHref: "https://www.ncaa.com",
    sourceLinkText: "ncaa.com",
    sourceLead:
      "No sportsbook affiliate links, independent research only. College assignment context from",
    historyRange: LEAGUE_HISTORY_RANGE.cbb,
    notifyLeague: "CBB",
    exploreLinks: leagueExploreLinks("cbb"),
  },
  cfb: {
    affiliationLabel: "NCAA football",
    sourceHref: "https://www.ncaa.com",
    sourceLinkText: "ncaa.com",
    sourceLead:
      "No sportsbook affiliate links, independent research only. College assignment context from",
    historyRange: LEAGUE_HISTORY_RANGE.cfb,
    notifyLeague: "CFB",
    exploreLinks: leagueExploreLinks("cfb"),
  },
};

export function footerConfigForLeague(league: FooterLeague): FooterLeagueConfig {
  return FOOTER_CONFIG[league];
}
