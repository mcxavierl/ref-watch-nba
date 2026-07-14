"use client";

import { Info } from "lucide-react";
import {
  EV_DISCLAIMER,
  edgeTone,
  type FindingEvSnapshot,
} from "@/lib/finding-ev-display";

function formatEdgeScore(score: number): string {
  const rounded = Math.round(score * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}%` : `${rounded.toFixed(1)}%`;
}

export function EdgeFinderCell({
  snapshot,
  compact = false,
}: {
  snapshot: FindingEvSnapshot | null | undefined;
  compact?: boolean;
}) {
  if (!snapshot) {
    return (
      <div className="edge-finder-cell edge-finder-cell--empty" aria-hidden={compact}>
        {!compact ? <span className="edge-finder-label">Edge</span> : null}
        <span className="edge-finder-value edge-finder-value--muted">—</span>
      </div>
    );
  }

  const tone = edgeTone(snapshot.edgeScore);

  return (
    <div
      className={`edge-finder-cell edge-finder-cell--${tone}`}
      data-edge-tone={tone}
    >
      <div className="edge-finder-head">
        <span className="edge-finder-label">Edge</span>
        <button
          type="button"
          className="edge-finder-disclaimer-trigger"
          aria-label={EV_DISCLAIMER}
          title={EV_DISCLAIMER}
        >
          <Info aria-hidden className="edge-finder-disclaimer-icon" />
        </button>
      </div>
      <span className="edge-finder-value">{formatEdgeScore(snapshot.edgeScore)}</span>
      {!compact ? (
        <span className="edge-finder-meta">
          {snapshot.marketLabel} @ {snapshot.marketOdds > 0 ? "+" : ""}
          {snapshot.marketOdds}
        </span>
      ) : null}
    </div>
  );
}
