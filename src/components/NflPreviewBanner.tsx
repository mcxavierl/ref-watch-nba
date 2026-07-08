import { AlertTriangle } from "lucide-react";
import {
  isNflVerifiedData,
  nflPreviewBannerMessage,
} from "@/lib/nfl/data-source";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function NflPreviewBanner({
  statsSource,
  assignmentsSource,
  atsAvailable,
}: {
  statsSource: RefStatsFile["meta"]["source"];
  assignmentsSource?: AssignmentsFile["source"];
  atsAvailable?: boolean;
}) {
  if (isNflVerifiedData(statsSource) && atsAvailable && statsSource === "espn") {
    return null;
  }

  const verifiedStats = isNflVerifiedData(statsSource);
  const message = nflPreviewBannerMessage(
    statsSource,
    assignmentsSource,
    atsAvailable,
  );

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
