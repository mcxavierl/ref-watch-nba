"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type LeagueHubTab = {
  id: string;
  label: string;
  panel: ReactNode;
};

type LeagueHubTabsProps = {
  tabs: LeagueHubTab[];
  defaultTabId: string;
  ariaLabel: string;
};

export function LeagueHubTabs({
  tabs,
  defaultTabId,
  ariaLabel,
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

  return (
    <div className="league-hub">
      <div
        className="refs-directory-tabs league-hub-tabs"
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
              className={`refs-directory-tab ${isActive ? "refs-directory-tab-active" : ""}`}
              onClick={() => selectTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
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
