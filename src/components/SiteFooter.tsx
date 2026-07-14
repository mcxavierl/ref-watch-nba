import Link from "next/link";
import {
  formatRefStatsRange as formatNbaRange,
  getRefStats as getNbaRefStats,
} from "@/lib/data";
import {
  formatRefStatsRange as formatNhlRange,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import {
  formatRefStatsRange as formatCbbRange,
  getRefStats as getCbbRefStats,
} from "@/lib/cbb/data";
import {
  formatRefStatsRange as formatEplRange,
  getRefStats as getEplRefStats,
} from "@/lib/epl/data";
import {
  formatRefStatsRange as formatCfbRange,
  getRefStats as getCfbRefStats,
} from "@/lib/cfb/data";
import {
  formatRefStatsRange as formatNflRange,
  getRefStats as getNflRefStats,
} from "@/lib/nfl/data";
import {
  formatRefStatsRange as formatLaligaRange,
  getRefStats as getLaligaRefStats,
} from "@/lib/laliga/data";
import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES } from "@/lib/leagues";
import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";

export type FooterLeague =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

const DATA_SOURCES: Record<
  FooterLeague,
  { label: string; href: string; linkText: string }
> = {
  nba: {
    label: "NBA",
    href: "https://official.nba.com/referee-assignments/",
    linkText: "official.nba.com",
  },
  nhl: {
    label: "NHL",
    href: "https://api-web.nhle.com",
    linkText: "api-web.nhle.com",
  },
  nfl: {
    label: "the NFL",
    href: "https://www.espn.com/nfl/",
    linkText: "espn.com/nfl",
  },
  cbb: {
    label: "NCAA men's basketball",
    href: "https://www.ncaa.com",
    linkText: "ncaa.com",
  },
  cfb: {
    label: "NCAA football",
    href: "https://www.ncaa.com",
    linkText: "ncaa.com",
  },
  epl: {
    label: "Premier League",
    href: "https://www.premierleague.com",
    linkText: "premierleague.com",
  },
  laliga: {
    label: "La Liga",
    href: "https://www.laliga.com",
    linkText: "laliga.com",
  },
};

function footerData(league: FooterLeague) {
  switch (league) {
    case "nhl":
      return { stats: getNhlRefStats(), formatRange: formatNhlRange };
    case "nfl":
      return { stats: getNflRefStats(), formatRange: formatNflRange };
    case "laliga":
      return { stats: getLaligaRefStats(), formatRange: formatLaligaRange };
    case "cbb":
      return { stats: getCbbRefStats(), formatRange: formatCbbRange };
    case "cfb":
      return { stats: getCfbRefStats(), formatRange: formatCfbRange };
    case "epl":
      return { stats: getEplRefStats(), formatRange: formatEplRange };
    default:
      return { stats: getNbaRefStats(), formatRange: formatNbaRange };
  }
}

const EXPLORE_LINKS = [
  { key: "insights", label: "Insights" },
  { key: "refs", label: "Refs" },
  { key: "teams", label: "Teams" },
  { key: "matrix", label: "Matrix" },
  { key: "methodology", label: "Methodology", href: "/methodology" },
  {
    key: "contact",
    label: "Contact Me",
    href: "mailto:mcxl55@gmail.com",
    external: true,
  },
] as const;

export function SiteFooter({ league }: { league: FooterLeague }) {
  const { stats, formatRange } = footerData(league);
  const range = formatRange(stats.meta);
  const source = DATA_SOURCES[league];
  const config = LEAGUES[league];
  const prefix = config.pathPrefix;
  const hrefs: Record<string, string> = {
    insights: insightsViewHref(league, "tendencies"),
    refs: prefix ? `${prefix}/refs` : "/refs",
    teams: prefix ? `${prefix}/teams` : "/teams",
    matrix: prefix ? `${prefix}/matrix` : "/matrix",
  };

  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="site-footer-heading">Data sources</p>
            <p className="site-footer-body">
              Not affiliated with {source.label}. No sportsbook affiliate links,
              independent research only. Official assignments from{" "}
              <a
                href={source.href}
                className="site-footer-inline-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.linkText}
              </a>
              . Historical stats cover {range}.
            </p>
          </div>
          <div>
            <p className="site-footer-heading">Explore</p>
            <ul className="site-footer-explore space-y-1.5">
              {EXPLORE_LINKS.map((item) => {
                const href =
                  "href" in item ? item.href : hrefs[item.key];
                const className = "site-footer-link";

                if ("external" in item && item.external) {
                  return (
                    <li key={item.key}>
                      <a href={href} className={className}>
                        {item.label}
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.key}>
                    <Link href={href} className={className}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="site-footer-heading">Disclaimer</p>
            <p className="site-footer-body">
              Patterns from past games, not predictions. For research and
              entertainment only. Not betting advice.
            </p>
            <p className="mt-3 site-footer-body">
              <SeasonNotifyCta
                league={
                  config.dataLeague as
                    | "NBA"
                    | "NHL"
                    | "NFL"
                    | "EPL"
                    | "LALIGA"
                    | "CBB"
                    | "CFB"
                }
                variant="link"
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
