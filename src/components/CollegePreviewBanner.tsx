import { StatusBadge } from "@/components/hub/StatusBadge";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

type CollegePreviewBannerProps = {
  statsSource: RefStatsFile["meta"]["source"];
  assignmentsSource?: AssignmentsFile["source"];
  isVerifiedData: (source: string | undefined) => boolean;
  message: (
    statsSource: RefStatsFile["meta"]["source"],
    assignmentsSource?: AssignmentsFile["source"],
  ) => string;
};

/**
 * CLINICAL MODERN STANDARD: college hub data-source banner with StatusBadge verdict.
 */
export function CollegePreviewBanner({
  statsSource,
  assignmentsSource,
  isVerifiedData,
  message,
}: CollegePreviewBannerProps) {
  if (isVerifiedData(statsSource) && assignmentsSource === "espn") {
    return null;
  }

  const verifiedStats = isVerifiedData(statsSource);
  const bannerMessage = message(statsSource, assignmentsSource);

  return (
    <div
      className={
        verifiedStats ? "offseason-alert" : "offseason-alert border-amber-300 bg-amber-50"
      }
      role="status"
    >
      <StatusBadge
        verdict={verifiedStats ? "caution" : "fail"}
        label={verifiedStats ? "Assignments pending" : "Preview data"}
        compact
        className="offseason-alert-badge"
      />
      <p className="offseason-alert-text">{bannerMessage}</p>
    </div>
  );
}
