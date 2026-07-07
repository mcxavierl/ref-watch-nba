import { formatDate } from "@/lib/data";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

function freshnessLabel(
  statsSeeded: boolean,
  assignmentsSeeded: boolean,
): string {
  if (!statsSeeded && !assignmentsSeeded) return "Live data";
  if (statsSeeded && assignmentsSeeded) return "Seeded data";
  if (statsSeeded) return "Live assignments · seeded stats";
  return "Live stats · seeded assignments";
}

export function DataFreshnessMeta({
  assignments,
  refStats,
}: {
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
}) {
  const statsSeeded = refStats.meta.source === "seeded";
  const assignmentsSeeded = assignments.source === "seeded";
  const allLive = !statsSeeded && !assignmentsSeeded;

  return (
    <p className="page-meta">
      <span className={allLive ? "page-meta-live" : "page-meta-seeded"}>
        <span
          className={`size-1.5 rounded-full ${allLive ? "bg-emerald-500" : "bg-amber-500"}`}
          aria-hidden
        />
        {freshnessLabel(statsSeeded, assignmentsSeeded)}
      </span>
      <span>
        Assignments {formatDate(assignments.lastUpdated)} · Stats{" "}
        {formatDate(refStats.meta.lastUpdated)}
      </span>
      <span className="text-zinc-500">
        {assignments.source} / {refStats.meta.source}
      </span>
      {statsSeeded && (
        <span className="text-amber-800">
          Stats are representative — run{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-border">
            npm run build-ref-data
          </code>{" "}
          for live NBA Stats backfill
        </span>
      )}
    </p>
  );
}
