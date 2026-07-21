import { formatDate } from "@/lib/data";
import { isOffseasonSlate } from "@/lib/offseason";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function DataFreshnessMeta({
  assignments,
  refStats,
  className,
}: {
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB" | "WNBA";
  className?: string;
}) {
  const offseason = isOffseasonSlate(assignments);

  return (
    <p className={["page-meta-updated", className].filter(Boolean).join(" ")}>
      {offseason ? (
        <>Stats updated {formatDate(refStats.meta.lastUpdated)}</>
      ) : (
        <>
          Assignments {formatDate(assignments.lastUpdated)} · Stats{" "}
          {formatDate(refStats.meta.lastUpdated)}
        </>
      )}
    </p>
  );
}
