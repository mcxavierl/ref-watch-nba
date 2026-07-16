import { CollegePreviewBanner } from "@/components/CollegePreviewBanner";
import {
  cfbPreviewBannerMessage,
  isCfbVerifiedData,
} from "@/lib/cfb/data-source";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function CfbPreviewBanner({
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
      isVerifiedData={isCfbVerifiedData}
      message={cfbPreviewBannerMessage}
    />
  );
}
