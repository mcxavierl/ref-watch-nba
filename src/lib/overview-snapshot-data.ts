import overviewSnapshotJson from "../../data/overview-snapshot.json";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { overviewStandoutSplitCards } from "@/lib/insight-editorial";
import { groupOverviewSlateByLeague } from "@/lib/overview-upcoming-slate";

type OverviewSnapshotFile = {
  generatedAt?: string;
  snapshot: CrossLeagueOverview;
};

/** Bundled at build time — overview must not parse multi-league ref-stats at request time. */
export function loadOverviewSnapshot(): CrossLeagueOverview {
  const file = overviewSnapshotJson as unknown as OverviewSnapshotFile;
  const snap = file.snapshot as Partial<CrossLeagueOverview> & typeof file.snapshot;
  const upcomingSlate = snap.upcomingSlate;
  const normalizedUpcomingSlate = upcomingSlate
    ? {
        ...upcomingSlate,
        leagueGroups:
          upcomingSlate.leagueGroups ??
          groupOverviewSlateByLeague(upcomingSlate.games ?? []),
      }
    : upcomingSlate;

  const insightCards = snap.insightCards ?? [];
  const standoutSplitCards =
    snap.standoutSplitCards ??
    overviewStandoutSplitCards(insightCards, null);

  return {
    ...snap,
    insightCards,
    standoutSplitCards,
    upcomingSlate: normalizedUpcomingSlate,
    topStories: snap.topStories ?? snap.insightCards ?? [],
    topStoriesStatus: snap.topStoriesStatus ?? "ready",
    topStoriesGeneratedAt:
      snap.topStoriesGeneratedAt ?? file.generatedAt ?? null,
  } as CrossLeagueOverview;
}
