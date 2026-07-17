"use client";

import { useState } from "react";
import { OverviewComparativeScorecard } from "@/components/OverviewComparativeScorecard";
import { OverviewQuickLists } from "@/components/OverviewQuickLists";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type TabId = "pace" | "lists";

type OverviewSecondaryTabsProps = {
  data: CrossLeagueOverview;
};

export function OverviewSecondaryTabs({ data }: OverviewSecondaryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("lists");

  const tabs: { id: TabId; label: string }[] = [
    { id: "lists", label: "Quick lists" },
    { id: "pace", label: "Pace scorecard" },
  ];

  return (
    <section
      className="overview-secondary-tabs section-block overview-section--secondary"
      aria-labelledby="overview-secondary-tabs-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <h2 className="overview-section-title" id="overview-secondary-tabs-heading">
          More from the dashboard
        </h2>
        <p className="overview-section-lead">
          Ranked shortcuts and cross-league pace - open when you need them.
        </p>
      </div>

      <div className="overview-secondary-tabs-bar" role="tablist" aria-label="Dashboard sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`overview-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`overview-tabpanel-${tab.id}`}
            className={`overview-secondary-tab${activeTab === tab.id ? " overview-secondary-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="overview-tabpanel-pace"
        role="tabpanel"
        aria-labelledby="overview-tab-pace"
        hidden={activeTab !== "pace"}
        className="overview-secondary-tabpanel"
      >
        <OverviewComparativeScorecard cards={data.leagueCards} />
      </div>

      <div
        id="overview-tabpanel-lists"
        role="tabpanel"
        aria-labelledby="overview-tab-lists"
        hidden={activeTab !== "lists"}
        className="overview-secondary-tabpanel"
      >
        <OverviewQuickLists
          leagueCards={data.leagueCards}
          insightCards={data.insightCards}
        />
      </div>
    </section>
  );
}
