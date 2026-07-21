import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { LeagueId } from "@/lib/leagues";
import {
  buildMediaCardContent,
  buildRefMediaCardContent,
  formatCrewLabel,
} from "@/lib/media/media-card-content";
import {
  buildOnAirCopyFromContent,
  type OnAirCopyFormat,
} from "@/lib/media/on-air-copy";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export function buildOnAirCopy(
  preview: GameSlatePreviewPayload,
  evidence: ProjectionEvidencePayload,
  format: OnAirCopyFormat = "full",
): string {
  const content = buildMediaCardContent(preview, evidence);
  return buildOnAirCopyFromContent(content, formatCrewLabel(preview), format);
}

export function buildRefOnAirCopy(
  leagueId: LeagueId,
  profile: RefProfile,
  stats: RefStatsFile,
  qualified: boolean,
  format: OnAirCopyFormat = "full",
): string {
  const content = buildRefMediaCardContent(leagueId, profile, stats, qualified);
  return buildOnAirCopyFromContent(content, profile.name, format);
}
