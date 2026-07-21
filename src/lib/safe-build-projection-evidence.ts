import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { normalizeGameSlatePreview } from "@/lib/normalize-game-slate-preview";

export function safeBuildProjectionEvidence(
  preview: GameSlatePreviewPayload | null | undefined,
): ProjectionEvidencePayload | null {
  const normalized = normalizeGameSlatePreview(preview);
  if (!normalized) return null;
  try {
    return buildProjectionEvidence(normalized);
  } catch {
    return null;
  }
}
