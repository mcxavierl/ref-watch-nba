"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  foulViewQueryValue,
  parseFoulViewParam,
  type FoulView,
} from "@/lib/foul-view";

export function useFoulView(): {
  view: FoulView;
  setView: (view: FoulView) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = parseFoulViewParam(searchParams?.get("view"));

  const setView = useCallback(
    (next: FoulView) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const queryValue = foulViewQueryValue(next);
      if (queryValue) {
        params.set("view", queryValue);
      } else {
        params.delete("view");
      }
      const query = params.toString();
      const resolvedPath = pathname ?? "/";
      router.replace(query ? `${resolvedPath}?${query}` : resolvedPath, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return { view, setView };
}
