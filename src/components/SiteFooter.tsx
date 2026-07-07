import { formatDate, getAssignments, getRefStats } from "@/lib/data";

export function SiteFooter() {
  const assignments = getAssignments();
  const refStats = getRefStats();

  return (
    <footer className="mt-auto border-t border-border bg-surface-raised">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="text-xs font-semibold text-zinc-700">Data refresh</p>
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-zinc-600">
            Assignments {formatDate(assignments.lastUpdated)} (
            {assignments.source}) · Stats{" "}
            {formatDate(refStats.meta.lastUpdated)} ({refStats.meta.source})
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            Re-run before tip-off:{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-zinc-800">
              npm run build-ref-data
            </code>{" "}
            (assignments + stats) or{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-zinc-800">
              npm run fetch-assignments
            </code>{" "}
            (assignments only).
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-zinc-700">
              Responsible gambling
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Informational use only. Past referee trends do not guarantee future
              results. Set limits and seek help if needed —{" "}
              <a
                href="https://www.connexontario.ca/"
                className="font-medium text-raptors underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                ConnexOntario 1-866-531-2600
              </a>
              .
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-700">Sources</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Not affiliated with the NBA. Assignments from{" "}
              <a
                href="https://official.nba.com/referee-assignments/"
                className="font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
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
