import {
  insightDrilldownAssetPath,
  type InsightDrilldownPayload,
} from "@/lib/insight-drilldown-types";

const drilldownCache = new Map<string, InsightDrilldownPayload>();

export async function fetchInsightDrilldown(
  drilldownId: string,
): Promise<InsightDrilldownPayload | null> {
  const cached = drilldownCache.get(drilldownId);
  if (cached) return cached;

  try {
    const res = await fetch(insightDrilldownAssetPath(drilldownId), {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as InsightDrilldownPayload;
    if (!data?.drilldownId || !Array.isArray(data.games)) return null;
    drilldownCache.set(drilldownId, data);
    return data;
  } catch {
    return null;
  }
}
