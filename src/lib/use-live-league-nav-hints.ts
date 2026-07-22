"use client";

import { useEffect, useState } from "react";

type OverviewSnapshotPayload = {
  snapshot?: {
    upcomingSlate?: {
      leagueGroups?: Array<{
        leagueId: string;
        liveCount: number;
        scheduledCount: number;
      }>;
    };
  };
};

async function fetchLiveLeagueHints(): Promise<Set<string>> {
  const res = await fetch("/data/overview/snapshot.json", { cache: "no-store" });
  if (!res.ok) return new Set();
  const body = (await res.json()) as OverviewSnapshotPayload;
  const groups = body.snapshot?.upcomingSlate?.leagueGroups ?? [];
  const live = new Set<string>();
  for (const group of groups) {
    if (group.liveCount > 0 || group.scheduledCount > 0) {
      live.add(group.leagueId);
    }
  }
  return live;
}

export function useLiveLeagueNavHints(): Set<string> {
  const [leagueIds, setLeagueIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const hints = await fetchLiveLeagueHints();
      if (!cancelled) setLeagueIds(hints);
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return leagueIds;
}
