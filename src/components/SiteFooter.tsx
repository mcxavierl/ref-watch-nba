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
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";

type FooterLeague = "nba" | "nhl" | "epl" | "cbb" | "cfb";

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
};

function footerData(league: FooterLeague) {
  switch (league) {
    case "nhl":
      return { stats: getNhlRefStats(), formatRange: formatNhlRange };
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

export function SiteFooter({ league }: { league: FooterLeague }) {
  const { stats, formatRange } = footerData(league);
  const range = formatRange(stats.meta);
  const source = DATA_SOURCES[league];
  const config = LEAGUES[league];
  const researchHref = `${config.pathPrefix}/research` || "/research";
  const rankingsHref = `${config.pathPrefix}/rankings` || "/rankings";
  const trendsHref = `${config.pathPrefix}/trends` || "/trends";

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
                className="font-medium text-zinc-300 underline-offset-2 hover:text-raptors hover:underline"
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
            <ul className="site-footer-body space-y-1.5">
              <li>
                <Link
                  href={researchHref}
                  className="font-medium text-zinc-300 underline-offset-2 hover:text-raptors hover:underline"
                >
                  Research hub
                </Link>
              </li>
              <li>
                <Link
                  href={rankingsHref}
                  className="font-medium text-zinc-300 underline-offset-2 hover:text-raptors hover:underline"
                >
                  Referee tendency index
                </Link>
              </li>
              <li>
                <Link
                  href={trendsHref}
                  className="font-medium text-zinc-300 underline-offset-2 hover:text-raptors hover:underline"
                >
                  League trends
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="font-medium text-zinc-300 underline-offset-2 hover:text-raptors hover:underline">
                  Methodology
                </Link>
              </li>
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
                league={config.dataLeague as "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB"}
                variant="link"
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
