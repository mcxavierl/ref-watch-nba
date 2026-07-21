"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { GameSlatePreviewDrawer } from "@/components/GameSlatePreviewDrawer";
import type { TodaysBiggestEdgeView } from "@/lib/homepage-dual-narrative";
import "./homepage-dual-narrative.css";

type TodaysBiggestEdgeProps = {
  edge: TodaysBiggestEdgeView;
};

export function TodaysBiggestEdge({ edge }: TodaysBiggestEdgeProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <section className="todays-biggest-edge section-block" aria-labelledby="todays-biggest-edge-heading">
        <div className="todays-biggest-edge-badge">
          <span className="todays-biggest-edge-status" aria-hidden />
          <span>Live Intelligence • Today&apos;s Biggest Edge</span>
        </div>

        <h1 className="todays-biggest-edge-matchup" id="todays-biggest-edge-heading">
          {edge.matchup}
        </h1>
        <p className="todays-biggest-edge-league">{edge.leagueLabel}</p>

        <div className="todays-biggest-edge-stats">
          <div className="todays-biggest-edge-stat">
            <span className="todays-biggest-edge-stat-label">Projected Fouls</span>
            <span className="todays-biggest-edge-stat-value tabular-nums">
              {edge.projectedFouls.toFixed(1)}
            </span>
          </div>
          <div className="todays-biggest-edge-stat">
            <span className="todays-biggest-edge-stat-label">Market Expectation</span>
            <span className="todays-biggest-edge-stat-value tabular-nums">
              {edge.marketExpectation.toFixed(1)}
            </span>
          </div>
          <div className="todays-biggest-edge-stat">
            <span className="todays-biggest-edge-stat-label">Projected Delta</span>
            <span className="todays-biggest-edge-stat-value todays-biggest-edge-stat-value--delta tabular-nums">
              {edge.projectedDelta >= 0 ? "+" : ""}
              {edge.projectedDelta.toFixed(1)}
            </span>
          </div>
          <div className="todays-biggest-edge-stat">
            <span className="todays-biggest-edge-stat-label">Confidence Rating</span>
            <span className="todays-biggest-edge-confidence tabular-nums">
              {edge.confidencePct}% Confidence
            </span>
          </div>
        </div>

        <ul className="todays-biggest-edge-bullets" aria-label="Quick evidence summary">
          {edge.evidenceBullets.map((bullet) => (
            <li key={bullet} className="todays-biggest-edge-bullet">
              • {bullet}
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="btn-primary todays-biggest-edge-cta inline-flex items-center gap-1.5"
          onClick={() => setDrawerOpen(true)}
        >
          View Full Evidence &amp; Analysis
          <ArrowRight size={16} aria-hidden />
        </button>
      </section>

      <GameSlatePreviewDrawer
        preview={edge.preview}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
