"use client";

import { ExportOnAirGraphicTrigger } from "@/components/media/MediaCardModal";
import type { MediaBroadcastExport } from "@/lib/media/media-card-types";

type RefProfileBroadcastKitProps = {
  broadcastExport: MediaBroadcastExport;
  className?: string;
};

export function RefProfileBroadcastKit({
  broadcastExport,
  className = "",
}: RefProfileBroadcastKitProps) {
  return (
    <ExportOnAirGraphicTrigger
      broadcastExport={broadcastExport}
      title="Producer On-Air Copy"
      className={className}
    />
  );
}
