import type { RefIntelligenceFingerprint } from "@/lib/ref-intelligence-profile";
import {
  RefProfileBadgePill,
  RefProfileBadgeRow,
} from "@/components/ref-profile/RefProfileBadgeRow";
import "./officiating-intelligence-profile.css";

export function RefFingerprintBadgeGrid({
  fingerprint,
}: {
  fingerprint: RefIntelligenceFingerprint;
}) {
  const foulTone =
    fingerprint.foulsDeltaSigned > 0.25
      ? "negative"
      : fingerprint.foulsDeltaSigned < -0.25
        ? "positive"
        : "neutral";

  return (
    <div className="ref-fingerprint-grid" aria-label="Officiating fingerprint badges">
      <RefProfileBadgeRow className="ref-fingerprint-badge-row">
        <RefProfileBadgePill tone="caution" className="ref-fingerprint-pill ref-fingerprint-pill--primary">
          {fingerprint.primaryStyle}
        </RefProfileBadgePill>
        <RefProfileBadgePill tone="neutral" className="ref-fingerprint-pill tabular-nums">
          Pace Impact: {fingerprint.paceImpactLabel}
        </RefProfileBadgePill>
        <RefProfileBadgePill tone={foulTone} className="ref-fingerprint-pill tabular-nums">
          Fouls/Game Delta: {fingerprint.foulsDeltaLabel}
        </RefProfileBadgePill>
        <RefProfileBadgePill tone="neutral" className="ref-fingerprint-pill tabular-nums">
          Replay Overturn Rate: {fingerprint.replayOverturnLabel}
        </RefProfileBadgePill>
      </RefProfileBadgeRow>
      <p className="ref-fingerprint-sample-meta">{fingerprint.sampleMeta}</p>
    </div>
  );
}
