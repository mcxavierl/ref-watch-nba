import {
  formatDate as formatNbaDate,
  formatRefStatsRange as formatNbaRange,
  getAssignments as getNbaAssignments,
  getRefStats as getNbaRefStats,
} from "@/lib/data";
import {
  formatDate as formatNhlDate,
  formatRefStatsRange as formatNhlRange,
  getAssignments as getNhlAssignments,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";

export function SiteFooter({ league }: { league: "nba" | "nhl" }) {
  const isNhl = league === "nhl";

  const assignments = isNhl ? getNhlAssignments() : getNbaAssignments();
  const refStats = isNhl ? getNhlRefStats() : getNbaRefStats();
  const formatDate = isNhl ? formatNhlDate : formatNbaDate;
  const formatRefStatsRange = isNhl ? formatNhlRange : formatNbaRange;

  const refCount = refStats.meta.refCount ?? refStats.refs.length;
  const range = formatRefStatsRange(refStats.meta);
  const games = refStats.meta.totalGamesProcessed;

  return (
    <footer className="mt-auto border-t border-border bg-surface-raised">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="text-sm font-semibold text-zinc-700">Data refresh</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Assignments {formatDate(assignments.lastUpdated)} (
            {assignments.source}) · Stats{" "}
            {formatDate(refStats.meta.lastUpdated)} ({refStats.meta.source})
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {refCount} {isNhl ? "officials" : "refs"}
            {games ? ` · ${games.toLocaleString()} games` : ""} · {range}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Re-run before {isNhl ? "puck-drop" : "tip-off"}:{" "}
            <code className="rounded bg-surface-raised px-2 py-0.5 font-mono text-sm text-zinc-800">
              {isNhl ? "npm run build-nhl-data" : "npm run build-ref-data"}
            </code>{" "}
            (assignments + stats) or{" "}
            <code className="rounded bg-surface-raised px-2 py-0.5 font-mono text-sm text-zinc-800">
              {isNhl
                ? "npm run fetch-nhl-assignments"
                : "npm run fetch-assignments"}
            </code>{" "}
            (assignments only).
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-zinc-700">Data sources</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Not affiliated with the {isNhl ? "NHL" : "NBA"}. Assignments from{" "}
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
              . Methodology in README.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
