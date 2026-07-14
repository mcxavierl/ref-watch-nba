import overviewSnapshotJson from "../../data/overview-snapshot.json";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type OverviewSnapshotFile = {
  generatedAt?: string;
  snapshot: CrossLeagueOverview;
};

/** Bundled at build time — overview must not parse multi-league ref-stats at request time. */
export function loadOverviewSnapshot(): CrossLeagueOverview {
  const file = overviewSnapshotJson as unknown as OverviewSnapshotFile;
  const snap = file.snapshot as Partial<CrossLeagueOverview> & typeof file.snapshot;
  return {
    ...snap,
    topStories: snap.topStories ?? snap.insightCards ?? [],
    topStoriesStatus: snap.topStoriesStatus ?? "ready",
    topStoriesGeneratedAt:
      snap.topStoriesGeneratedAt ?? file.generatedAt ?? null,
  } as CrossLeagueOverview;
}
