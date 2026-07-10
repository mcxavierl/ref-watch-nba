"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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
  leagueId?: string;
  /** Content above the tablist (title stack, back link, etc.). */
  before?: ReactNode;
  /** Content between tablist and panel (meta row). */
  afterTablist?: ReactNode | ((activeId: string) => ReactNode);
};

export function LeagueHubTabs({
  tabs,
  defaultTabId,
  ariaLabel,
  variant = "default",
  leagueId,
  before,
  afterTablist,
}: LeagueHubTabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId);

  const syncFromHash = useCallback(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && tabs.some((t) => t.id === hash)) {
      setActiveId(hash);
    }
  }, [tabs]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  const selectTab = (id: string) => {
    setActiveId(id);
    const next = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, "", next);
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
      {tabs.map((tab) => {
        const isActive = tab.id === active.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`hub-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`hub-panel-${tab.id}`}
            className={
              variant === "insights"
                ? `insights-hero-tab${isActive ? " insights-hero-tab-active" : ""}`
                : `refs-directory-tab ${isActive ? "refs-directory-tab-active" : ""}`
            }
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  if (variant === "insights") {
    return (
      <div className="league-hub league-hub--insights">
        <section
          className="insights-hero"
          data-league={leagueId}
          aria-label={ariaLabel}
        >
          <div className="insights-hero-watermark" aria-hidden />
          <div className="insights-hero-inner">
            {before}
            {tablist}
            {after}
            {active.note ? (
              <p className="insights-hero-note">{active.note}</p>
            ) : null}
          </div>
        </section>
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
