"use client";

import { useState } from "react";
import { OfficiatingFingerprint } from "@/components/visuals/OfficiatingFingerprint";
import type { OfficiatingFingerprintData } from "@/lib/analytics/officiating-fingerprint";

export type CrewFingerprintEntry = {
  slug: string;
  name: string;
  role?: string;
  fingerprint: OfficiatingFingerprintData;
};

type GameSlateFingerprintPanelProps = {
  crewFingerprints: CrewFingerprintEntry[];
};

export function GameSlateFingerprintPanel({
  crewFingerprints,
}: GameSlateFingerprintPanelProps) {
  const [activeSlug, setActiveSlug] = useState(crewFingerprints[0]?.slug ?? "");
  const active =
    crewFingerprints.find((entry) => entry.slug === activeSlug) ??
    crewFingerprints[0] ??
    null;

  if (!active) return null;

  return (
    <section
      className="game-slate-fingerprint-panel"
      aria-label="Officiating fingerprint"
    >
      {crewFingerprints.length > 1 ? (
        <div
          className="officiating-fingerprint-tabs"
          role="tablist"
          aria-label="Crew fingerprint selector"
        >
          {crewFingerprints.map((entry) => (
            <button
              key={entry.slug}
              type="button"
              role="tab"
              aria-selected={entry.slug === active.slug}
              className={`officiating-fingerprint-tab${
                entry.slug === active.slug ? " officiating-fingerprint-tab--active" : ""
              }`}
              onClick={() => setActiveSlug(entry.slug)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="officiating-fingerprint-tabpanel" role="tabpanel">
        <OfficiatingFingerprint data={active.fingerprint} compact />
      </div>
    </section>
  );
}
