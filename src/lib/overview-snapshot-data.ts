import overviewSnapshotJson from "../../data/overview-snapshot.json";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type OverviewSnapshotFile = {
  generatedAt?: string;
  snapshot: CrossLeagueOverview;
};

/** Bundled at build time — overview must not parse multi-league ref-stats at request time. */
export function loadOverviewSnapshot(): CrossLeagueOverview {
  const file = overviewSnapshotJson as OverviewSnapshotFile;
  return file.snapshot;
}
