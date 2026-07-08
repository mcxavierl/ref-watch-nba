import { AlertTriangle } from "lucide-react";
import {
  eplPreviewBannerMessage,
  isEplVerifiedData,
} from "@/lib/epl/data-source";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function EplPreviewBanner({
  statsSource,
  assignmentsSource,
}: {
  statsSource: RefStatsFile["meta"]["source"];
  assignmentsSource?: AssignmentsFile["source"];
}) {
  if (isEplVerifiedData(statsSource) && assignmentsSource === "espn") {
    return null;
  }

  const verifiedStats = isEplVerifiedData(statsSource);
  const message = eplPreviewBannerMessage(statsSource, assignmentsSource);

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
