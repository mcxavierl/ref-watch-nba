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
    <footer className="mt-auto border-t border-border bg-surface-raised">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-zinc-800">Data sources</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
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
            <p className="text-sm font-semibold text-zinc-800">Disclaimer</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Patterns from past games — not predictions. For research and
              entertainment only. Not betting advice.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
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
