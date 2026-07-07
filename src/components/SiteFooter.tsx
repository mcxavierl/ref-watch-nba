import Link from "next/link";
import {
  formatRefStatsRange as formatNbaRange,
  getRefStats as getNbaRefStats,
} from "@/lib/data";
import {
  formatRefStatsRange as formatNhlRange,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { seasonNotifyMailto } from "@/lib/notify";

export function SiteFooter({ league }: { league: "nba" | "nhl" }) {
  const isNhl = league === "nhl";

  const refStats = isNhl ? getNhlRefStats() : getNbaRefStats();
  const formatRefStatsRange = isNhl ? formatNhlRange : formatNbaRange;
  const range = formatRefStatsRange(refStats.meta);
  const leagueLabel = isNhl ? "NHL" : "NBA";

  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="site-footer-heading">Data sources</p>
            <p className="site-footer-body">
              Not affiliated with the {leagueLabel}. No sportsbook affiliate
              links — independent research only. Official assignments from{" "}
              {isNhl ? (
                <a
                  href="https://api-web.nhle.com"
                  className="font-medium text-zinc-800 underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  api-web.nhle.com
                </a>
              ) : (
                <a
                  href="https://official.nba.com/referee-assignments/"
                  className="font-medium text-zinc-800 underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  official.nba.com
                </a>
              )}
              . Historical stats cover {range}.
            </p>
          </div>
          <div>
            <p className="site-footer-heading">Explore</p>
            <ul className="site-footer-body space-y-1.5">
              <li>
                <Link href="/research" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
                  Research hub
                </Link>
              </li>
              <li>
                <Link
                  href={isNhl ? "/nhl/rankings" : "/rankings"}
                  className="font-medium text-zinc-800 underline-offset-2 hover:underline"
                >
                  Referee rankings
                </Link>
              </li>
              <li>
                <Link
                  href={isNhl ? "/nhl/trends" : "/trends"}
                  className="font-medium text-zinc-800 underline-offset-2 hover:underline"
                >
                  League trends
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
                  Methodology
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="site-footer-heading">Disclaimer</p>
            <p className="site-footer-body">
              Patterns from past games — not predictions. For research and
              entertainment only. Not betting advice.
            </p>
            <p className="mt-3 site-footer-body">
              <a
                href={seasonNotifyMailto(leagueLabel)}
                className="font-medium text-zinc-800 underline-offset-2 hover:text-raptors hover:underline"
              >
                Get notified when the {leagueLabel} season starts
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
