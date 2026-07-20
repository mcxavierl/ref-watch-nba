"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NcaaConferenceLogo } from "@/components/NcaaConferenceLogo";
import "@/components/conference-coverage.css";
import {
  CBB_TRENDS_CONFERENCE_OPTIONS,
  cbbTrendsConferenceLabel,
  cbbTrendsConferenceSlug,
  type CbbTrendsConferenceScope,
} from "@/lib/cbb/conference-trends-shared";
import type { LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";

function isLiveConference(
  conference: CbbTrendsConferenceScope,
): conference is LiveNcaaConferenceId {
  return conference !== "all";
}

export function CbbConferenceTrendsToggle({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = searchParams?.get("conference") ?? "all";
  const active =
    CBB_TRENDS_CONFERENCE_OPTIONS.find(
      (option) => cbbTrendsConferenceSlug(option) === slug,
    ) ?? "all";

  const setConference = useCallback(
    (next: CbbTrendsConferenceScope) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const nextSlug = cbbTrendsConferenceSlug(next);
      if (nextSlug === "all") {
        params.delete("conference");
      } else {
        params.set("conference", nextSlug);
      }
      const query = params.toString();
      const resolvedPath = pathname ?? "/";
      router.replace(query ? `${resolvedPath}?${query}` : resolvedPath, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div
      className={`refs-directory-metric-toggle cbb-conference-trends-toggle ${className}`.trim()}
      role="group"
      aria-label="Conference scope"
    >
      {CBB_TRENDS_CONFERENCE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={`refs-directory-metric-btn cbb-conference-trends-btn${active === option ? " refs-directory-metric-btn-active" : ""}`}
          aria-pressed={active === option}
          onClick={() => setConference(option)}
        >
          {isLiveConference(option) ? (
            <NcaaConferenceLogo conferenceId={option} size={18} />
          ) : null}
          <span>{cbbTrendsConferenceLabel(option)}</span>
        </button>
      ))}
    </div>
  );
}
