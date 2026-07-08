import { AlertTriangle } from "lucide-react";
import { cbbPreviewBannerMessage, isCbbVerifiedData } from "@/lib/cbb/data-source";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function CbbPreviewBanner({
  statsSource,
  assignmentsSource,
}: {
  statsSource: RefStatsFile["meta"]["source"];
  assignmentsSource?: AssignmentsFile["source"];
}) {
  if (isCbbVerifiedData(statsSource) && assignmentsSource === "espn") {
    return null;
  }

  const verifiedStats = isCbbVerifiedData(statsSource);
  const message = cbbPreviewBannerMessage(statsSource, assignmentsSource);

  return (
    <div
      className={
        verifiedStats ? "offseason-alert" : "offseason-alert border-amber-300 bg-amber-50"
      }
      role="status"
    >
      <AlertTriangle className="offseason-alert-icon" aria-hidden />
      <p className="offseason-alert-text">{message}</p>
    </div>
  );
}
