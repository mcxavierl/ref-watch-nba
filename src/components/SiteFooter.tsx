import { formatDate, formatRefStatsRange, getAssignments, getRefStats } from "@/lib/data";

export function SiteFooter() {
  const assignments = getAssignments();
  const refStats = getRefStats();
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
            {refCount} refs
            {games ? ` · ${games.toLocaleString()} games` : ""} · {range}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Re-run before tip-off:{" "}
            <code className="rounded bg-surface-raised px-2 py-0.5 font-mono text-sm text-zinc-800">
              npm run build-ref-data
            </code>{" "}
            (assignments + stats) or{" "}
            <code className="rounded bg-surface-raised px-2 py-0.5 font-mono text-sm text-zinc-800">
              npm run fetch-assignments
            </code>{" "}
            (assignments only).
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-zinc-700">Data sources</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Not affiliated with the NBA. Assignments from{" "}
              <a
                href="https://official.nba.com/referee-assignments/"
                className="font-medium text-zinc-800 underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                official.nba.com
              </a>
              . Methodology in README.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
