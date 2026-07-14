import { AlertTriangle } from "lucide-react";
import {
  cfbPreviewBannerMessage,
  isCfbVerifiedData,
} from "@/lib/cfb/data-source";
import { cfbGameLogPreviewMessage, isCfbGameLogsPreview } from "@/lib/cfb/build-state";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function CfbPreviewBanner({
  statsSource,
  assignmentsSource,
}: {
  statsSource: RefStatsFile["meta"]["source"];
  assignmentsSource?: AssignmentsFile["source"];
}) {
  const previewMessage = cfbGameLogPreviewMessage();
  const inGameLogPreview = isCfbGameLogsPreview();

  if (
    !inGameLogPreview &&
    isCfbVerifiedData(statsSource) &&
    assignmentsSource === "espn"
  ) {
    return null;
  }

  const verifiedStats = isCfbVerifiedData(statsSource);
  const message =
    previewMessage ?? cfbPreviewBannerMessage(statsSource, assignmentsSource);

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
