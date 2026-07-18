import { StatusBadge } from "@/components/hub/StatusBadge";
import {
  cfbPreviewBannerMessage,
  isCfbOfficialsPending,
  isCfbVerifiedData,
} from "@/lib/cfb/data-source";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function CfbPreviewBanner({
  statsSource,
  assignmentsSource,
  refStats,
}: {
  statsSource: RefStatsFile["meta"]["source"];
  assignmentsSource?: AssignmentsFile["source"];
  refStats: Pick<RefStatsFile, "meta" | "refs">;
}) {
  const officialsPending = isCfbOfficialsPending(refStats);

  if (
    isCfbVerifiedData(statsSource) &&
    assignmentsSource === "espn" &&
    !officialsPending
  ) {
    return null;
  }

  const verifiedStats = isCfbVerifiedData(statsSource);
  const bannerMessage = cfbPreviewBannerMessage(statsSource, assignmentsSource, refStats);

  return (
    <div
      className={
        verifiedStats ? "offseason-alert" : "offseason-alert border-amber-300 bg-amber-50"
      }
      role="status"
    >
      <StatusBadge
        verdict={officialsPending ? "caution" : verifiedStats ? "caution" : "fail"}
        label={
          officialsPending
            ? "Officials pending"
            : verifiedStats
              ? "Assignments pending"
              : "Preview data"
        }
        compact
        className="offseason-alert-badge"
      />
      <p className="offseason-alert-text">{bannerMessage}</p>
    </div>
  );
}
