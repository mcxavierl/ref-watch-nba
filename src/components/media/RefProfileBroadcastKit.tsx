"use client";

import { MediaBroadcastKitTrigger } from "@/components/media/MediaBroadcastKitDrawer";
import { buildRefMediaCardContent } from "@/lib/media/media-card-content";
import { buildRefOnAirCopy } from "@/lib/media/on-air-copy";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type RefProfileBroadcastKitProps = {
  leagueId: LeagueId;
  profile: RefProfile;
  stats: RefStatsFile;
  qualified: boolean;
  className?: string;
};

export function RefProfileBroadcastKit({
  leagueId,
  profile,
  stats,
  qualified,
  className = "",
}: RefProfileBroadcastKitProps) {
  const content = buildRefMediaCardContent(leagueId, profile, stats, qualified);
  const teleprompterCopy = buildRefOnAirCopy(leagueId, profile, stats, qualified);

  return (
    <MediaBroadcastKitTrigger
      content={content}
      teleprompterCopy={teleprompterCopy}
      exportFilename={`ref-watch-${profile.slug}.png`}
      title="Media & Broadcast Kit"
      className={className}
    />
  );
}
