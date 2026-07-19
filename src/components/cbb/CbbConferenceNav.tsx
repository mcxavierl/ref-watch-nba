"use client";

import Link from "next/link";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NcaaConferenceLogo } from "@/components/NcaaConferenceLogo";
import {
  CBB_TRENDS_CONFERENCE_OPTIONS,
  cbbTrendsConferenceLabel,
  cbbTrendsConferenceSlug,
  type CbbTrendsConferenceScope,
} from "@/lib/cbb/conference-trends-shared";
import type { LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";
import type { ConferenceCoverageDisplayRow } from "@/lib/ncaa-conference-coverage";
import "./cbb-research-terminal.css";

function isLiveConference(
  conference: CbbTrendsConferenceScope,
): conference is LiveNcaaConferenceId {
  return conference !== "all";
}

type CbbConferenceNavProps = {
  coverageRows: ConferenceCoverageDisplayRow[];
  activeConference: CbbTrendsConferenceScope;
};

export function CbbConferenceNav({
  coverageRows,
  activeConference,
}: CbbConferenceNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      const resolvedPath = pathname ?? "/cbb";
      router.replace(query ? `${resolvedPath}?${query}` : resolvedPath, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const rowById = new Map(
    coverageRows.map((row) => [row.conferenceId, row]),
  );

  return (
    <nav
      className="cbb-conference-nav"
      aria-label="Conference scope"
    >
      <label className="cbb-conference-nav-select-wrap">
        <span className="cbb-conference-nav-select-label">Conference</span>
        <select
          className="cbb-conference-nav-select"
          value={cbbTrendsConferenceSlug(activeConference)}
          onChange={(event) => {
            const slug = event.target.value;
            const next =
              CBB_TRENDS_CONFERENCE_OPTIONS.find(
                (option) => cbbTrendsConferenceSlug(option) === slug,
              ) ?? "all";
            setConference(next);
          }}
        >
          {CBB_TRENDS_CONFERENCE_OPTIONS.map((option) => (
            <option
              key={option}
              value={cbbTrendsConferenceSlug(option)}
            >
              {cbbTrendsConferenceLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <div
        className="cbb-conference-chip-list"
        role="list"
      >
        {CBB_TRENDS_CONFERENCE_OPTIONS.map((option) => {
          const isActive = activeConference === option;
          const slug = cbbTrendsConferenceSlug(option);
          const href = slug === "all" ? "/cbb" : `/cbb?conference=${slug}`;
          const row = isLiveConference(option) ? rowById.get(option) : undefined;

          return (
            <Link
              key={option}
              href={href}
              role="listitem"
              className={`cbb-conference-chip${isActive ? " cbb-conference-chip--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {isLiveConference(option) ? (
                <NcaaConferenceLogo conferenceId={option} size={18} />
              ) : null}
              <span className="cbb-conference-chip-label">
                {cbbTrendsConferenceLabel(option)}
              </span>
              {row && row.distinctGames > 0 ? (
                <span className="cbb-conference-chip-count tabular-nums">
                  {row.distinctGames.toLocaleString("en-US")}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
