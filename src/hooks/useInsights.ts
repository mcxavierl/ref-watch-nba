"use client";

import { useEffect, useState } from "react";
import {
  INSIGHTS_PUBLIC_PATH,
  queryInsights,
  type InsightsPayload,
  type InsightsQueryResult,
} from "@/lib/insights/insights-query";

type UseInsightsOptions = {
  teamId?: string;
  initialData?: InsightsQueryResult;
  limit?: number;
};

export function useInsights({
  teamId,
  initialData,
  limit,
}: UseInsightsOptions = {}): InsightsQueryResult & { isLoading: boolean } {
  const [result, setResult] = useState<InsightsQueryResult>(
    initialData ?? { insights: [], status: "generated", generatedAt: null },
  );
  const [isLoading, setIsLoading] = useState(
    !initialData || (initialData.insights.length === 0 && !teamId),
  );

  useEffect(() => {
    if (!initialData) return;
    setResult(initialData);
    setIsLoading(initialData.insights.length === 0);
  }, [initialData?.generatedAt, initialData?.status, teamId, limit]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch(INSIGHTS_PUBLIC_PATH, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as InsightsPayload;
        if (cancelled) return;

        const next = queryInsights(payload, { teamId, limit });
        if (next.insights.length === 0 && initialData?.insights.length) return;

        setResult(next);
        setIsLoading(false);
      } catch {
        if (!cancelled && initialData) {
          setIsLoading(false);
        }
      }
    }

    void refresh();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [teamId, limit, initialData?.generatedAt]);

  return {
    ...result,
    isLoading,
  };
}
