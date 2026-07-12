"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LeagueHubHero,
  type HubHeroLeagueId,
} from "@/components/LeagueHubHero";
import {
  insightsViewFromHash,
  insightsViewFromPathname,
  insightsViewHref,
  type InsightsHubView,
} from "@/lib/insights-routes";

export type LeagueHubTab = {
  id: string;
  label: string;
  panel: ReactNode;
  /** Optional note shown in insights chrome for the active tab. */
  note?: ReactNode;
};

type LeagueHubTabsProps = {
  tabs: LeagueHubTab[];
  defaultTabId: string;
  ariaLabel: string;
  variant?: "default" | "insights";
  /** Sets sport watermark + accent on the insights hero. */
  leagueId?: HubHeroLeagueId;
  /** Content above the tablist (title stack, back link, etc.). */
  before?: ReactNode;
  /** Content between tablist and panel (meta row). */
  afterTablist?: ReactNode | ((activeId: string) => ReactNode);
};

function resolveInsightsTabId(
  pathname: string,
  defaultTabId: string,
  tabIds: string[],
): string {
  const fromPath = insightsViewFromPathname(pathname);
  if (fromPath && tabIds.includes(fromPath)) return fromPath;
  if (typeof window !== "undefined") {
    const fromHash = insightsViewFromHash(window.location.hash);
    if (fromHash && tabIds.includes(fromHash)) return fromHash;
  }
  return defaultTabId;
}

export function LeagueHubTabs({
  tabs,
  defaultTabId,
  ariaLabel,
  variant = "default",
  leagueId,
  before,
  afterTablist,
}: LeagueHubTabsProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const tabIds = tabs.map((tab) => tab.id);
  const [activeId, setActiveId] = useState(() =>
    variant === "insights" && leagueId
      ? resolveInsightsTabId(pathname, defaultTabId, tabIds)
      : defaultTabId,
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const syncInsightsTab = useCallback(() => {
    if (variant !== "insights" || !leagueId) return;
    const next = resolveInsightsTabId(pathname, defaultTabId, tabIds);
    setActiveId(next);
  }, [defaultTabId, leagueId, pathname, tabIds, variant]);

  const syncFromHash = useCallback(() => {
    if (variant === "insights") {
      syncInsightsTab();
      return;
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && tabs.some((t) => t.id === hash)) {
      setActiveId(hash);
    }
  }, [syncInsightsTab, tabs, variant]);

  useEffect(() => {
    if (variant !== "insights" || !leagueId) return;
    const fromHash = insightsViewFromHash(window.location.hash);
    if (!fromHash) return;
    const canonical = insightsViewFromPathname(pathname);
    if (canonical === fromHash) return;
    const query = searchParams?.toString();
    const href = insightsViewHref(leagueId, fromHash);
    router.replace(query ? `${href}?${query}` : href);
  }, [leagueId, pathname, router, searchParams, variant]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  useEffect(() => {
    if (variant === "insights") syncInsightsTab();
  }, [syncInsightsTab, variant]);

  const selectTab = (id: string) => {
    if (variant === "insights" && leagueId) {
      const view = id as InsightsHubView;
      const query = searchParams?.toString();
      const href = insightsViewHref(leagueId, view);
      router.push(query ? `${href}?${query}` : href);
      return;
    }
    setActiveId(id);
    const next = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, "", next);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = tabs.length;
    if (count === 0) return;

    let nextIndex = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        nextIndex = (index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        nextIndex = (index - 1 + count) % count;
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = count - 1;
        break;
      default:
        return;
    }

    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    selectTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const after =
    typeof afterTablist === "function"
      ? afterTablist(active.id)
      : afterTablist;

  const tablist = (
    <div
      className={
        variant === "insights"
          ? "insights-hero-tabs"
          : "refs-directory-tabs league-hub-tabs"
      }
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === active.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`hub-tab-${tab.id}`}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            aria-selected={isActive}
            aria-controls={`hub-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={
              variant === "insights"
                ? `insights-hero-tab${isActive ? " insights-hero-tab-active" : ""}`
                : `refs-directory-tab ${isActive ? "refs-directory-tab-active" : ""}`
            }
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  if (variant === "insights") {
    if (!leagueId) {
      throw new Error("LeagueHubTabs insights variant requires leagueId");
    }
    return (
      <div className="league-hub league-hub--insights">
        <LeagueHubHero leagueId={leagueId} aria-label={ariaLabel}>
          {before}
          {tablist}
          {after}
          {active.note ? (
            <p className="insights-hero-note">{active.note}</p>
          ) : null}
        </LeagueHubHero>
        <div
          role="tabpanel"
          id={`hub-panel-${active.id}`}
          aria-labelledby={`hub-tab-${active.id}`}
          className="league-hub-panel insights-hub-panel"
        >
          {active.panel}
        </div>
      </div>
    );
  }

  return (
    <div className="league-hub">
      {before}
      {tablist}
      {after}
      <div
        role="tabpanel"
        id={`hub-panel-${active.id}`}
        aria-labelledby={`hub-tab-${active.id}`}
        className="league-hub-panel"
      >
        {active.panel}
      </div>
    </div>
  );
}
