"use client";

import { useCallback, useMemo, useState } from "react";
import {
  mergeSufficiencyLists,
  partitionByDataSufficiency,
} from "@/lib/data-sufficiency";

export function useDataSufficiencyFilter<T>(
  items: readonly T[],
  meetsThreshold: (item: T) => boolean,
) {
  const [showAll, setShowAll] = useState(false);

  const { sufficient, insufficient } = useMemo(
    () => partitionByDataSufficiency(items, meetsThreshold),
    [items, meetsThreshold],
  );

  const visible = useMemo(
    () => mergeSufficiencyLists(sufficient, insufficient, showAll),
    [insufficient, showAll, sufficient],
  );

  const toggleShowAll = useCallback(() => {
    setShowAll((current) => !current);
  }, []);

  const expandList = useCallback(() => {
    setShowAll(true);
  }, []);

  const collapseList = useCallback(() => {
    setShowAll(false);
  }, []);

  return {
    showAll,
    setShowAll,
    toggleShowAll,
    expandList,
    collapseList,
    visible,
    sufficient,
    insufficient,
    sufficientCount: sufficient.length,
    hiddenCount: insufficient.length,
    meetsThreshold,
  };
}
