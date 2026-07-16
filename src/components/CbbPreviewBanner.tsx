import { CollegePreviewBanner } from "@/components/CollegePreviewBanner";
import { cbbPreviewBannerMessage, isCbbVerifiedData } from "@/lib/cbb/data-source";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function CbbPreviewBanner({
  statsSource,
  assignmentsSource,
}: {
  statsSource: RefStatsFile["meta"]["source"];
  assignmentsSource?: AssignmentsFile["source"];
}) {
  return (
    <CollegePreviewBanner
      statsSource={statsSource}
      assignmentsSource={assignmentsSource}
      isVerifiedData={isCbbVerifiedData}
      message={cbbPreviewBannerMessage}
    />
  );
}
