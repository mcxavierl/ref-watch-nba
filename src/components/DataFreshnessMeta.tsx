import { formatDate } from "@/lib/data";
import { isOffseasonSlate } from "@/lib/offseason";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

function freshnessLabel(
  statsSeeded: boolean,
  assignmentsSeeded: boolean,
): string {
  if (!statsSeeded && !assignmentsSeeded) return "Live data";
  if (statsSeeded && assignmentsSeeded) return "Historical sample data";
  if (statsSeeded) return "Live assignments · historical stats";
  return "Live stats · sample assignments";
}

export function DataFreshnessMeta({
  assignments,
  refStats,
  league = "NBA",
}: {
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
  league?: "NBA" | "NHL";
}) {
  const offseason = isOffseasonSlate(assignments);

  if (offseason) {
    return (
      <p className="page-meta">
        <span className="text-zinc-600">
          Offseason — historical data only. Live slate returns when the{" "}
          {league} season resumes.
        </span>
      </p>
    );
  }

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
    </p>
  );
}
